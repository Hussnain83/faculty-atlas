"use server";

import { refresh } from "next/cache";
import { getAccount } from "@/lib/auth";
import { cleanDoi, DOI_RE, ORCID_RE } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message?: string } | { ok: false; error: string; field?: string };
const fail = (error: string, field?: string): Result => ({ ok: false, error, field });
const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const isUuid = (v: string | null | undefined): v is string => Boolean(v && /^[0-9a-f-]{36}$/i.test(v));

/**
 * Whose profile is being edited? Your own, or, for an admin, the person they chose.
 * Row-level security still checks every write; this only picks the target.
 */
async function target(personId: string | null) {
  const account = await getAccount();
  if (!account) throw new Error("Sign in again to continue.");
  const id = account.isAdmin && isUuid(personId) ? personId : account.person?.id;
  if (!id) throw new Error("Your account is not linked to a directory entry.");
  if (!account.isAdmin && account.person?.status !== "active") throw new Error("Activate your account first.");
  return { supabase: await createClient(), personId: id, account };
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    const r = await fn();
    if (r.ok) refresh();
    return r;
  } catch (e) {
    return fail((e as Error).message || "Something went wrong. Try again.");
  }
}

/* ---------------------------------------------------------------- about */
export async function saveAbout(personId: string | null, _prev: Result | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const full_name = str(form, "full_name").replace(/\s+/g, " ");
    const bio = str(form, "bio");
    const orcid = str(form, "orcid").replace(/^https?:\/\/orcid\.org\//i, "").toUpperCase();
    if (full_name.length < 2 || full_name.length > 120) return fail("Enter your full name.", "full_name");
    if (bio.length > 1200) return fail("Keep the bio under 1,200 characters.", "bio");
    if (orcid && !ORCID_RE.test(orcid)) return fail("An ORCID iD looks like 0000-0002-1825-0097.", "orcid");
    const { error } = await supabase
      .from("people")
      .update({ full_name, bio: bio || null, orcid: orcid || null, office: str(form, "office") || null, phone_ext: str(form, "phone_ext") || null })
      .eq("id", id);
    if (error) return fail("We could not save your details. Try again.");
    return { ok: true, message: "Saved." };
  });
}

/* ---------------------------------------------------------------- photo */
export async function uploadPhoto(personId: string | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a photo first.");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return fail("Use a JPG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return fail("The photo must be under 5 MB.");
    const { data: person } = await supabase.from("people").select("photo_path").eq("id", id).single();
    const path = `${id}/avatar-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
    if (error) return fail("The upload failed. Try a smaller image.");
    const { error: saveError } = await supabase.from("people").update({ photo_path: path }).eq("id", id);
    if (saveError) return fail("We could not save the photo. Try again.");
    if (person?.photo_path) await supabase.storage.from("photos").remove([person.photo_path]);
    return { ok: true, message: "Photo updated." };
  });
}

export async function removePhoto(personId: string | null): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const { data: person } = await supabase.from("people").select("photo_path").eq("id", id).single();
    await supabase.from("people").update({ photo_path: null }).eq("id", id);
    if (person?.photo_path) await supabase.storage.from("photos").remove([person.photo_path]);
    return { ok: true, message: "Photo removed." };
  });
}

/* ---------------------------------------------------------------- CV */
export async function uploadCv(personId: string | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const file = form.get("cv");
    const pages = Number(form.get("pages")) || null;
    if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF first.");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return fail("The CV must be a PDF.");
    if (file.size > 10 * 1024 * 1024) return fail("The CV must be under 10 MB.");
    const { data: old } = await supabase.from("cvs").select("file_path").eq("person_id", id).maybeSingle();
    const path = `${id}/cv-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { contentType: "application/pdf" });
    if (error) return fail("The upload failed. Try again.");
    const fileName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "CV.pdf";
    const { error: saveError } = await supabase
      .from("cvs")
      .upsert({ person_id: id, file_path: path, file_name: fileName, size_bytes: file.size, pages: pages && pages < 500 ? pages : null, uploaded_at: new Date().toISOString() });
    if (saveError) return fail("We could not save the CV. Try again.");
    if (old?.file_path && old.file_path !== path) await supabase.storage.from("cvs").remove([old.file_path]);
    return { ok: true, message: "CV uploaded." };
  });
}

export async function removeCv(personId: string | null): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const { data: old } = await supabase.from("cvs").select("file_path").eq("person_id", id).maybeSingle();
    await supabase.from("cvs").delete().eq("person_id", id);
    if (old?.file_path) await supabase.storage.from("cvs").remove([old.file_path]);
    return { ok: true, message: "CV removed." };
  });
}

/* ---------------------------------------------------------------- skills */
const CATEGORIES = ["research", "tools", "teaching"] as const;
type Category = (typeof CATEGORIES)[number];

export async function addSkill(personId: string | null, skillRaw: string, categoryRaw: string): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const skill = skillRaw.trim().replace(/\s+/g, " ").slice(0, 60);
    const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? (categoryRaw as Category) : "research";
    if (!skill) return fail("Type a skill first.", "skill");
    const { data: existing } = await supabase.from("person_skills").select("skill, position").eq("person_id", id);
    if ((existing ?? []).some((s) => s.skill.toLowerCase() === skill.toLowerCase())) return fail("You already listed this skill.", "skill");
    if ((existing ?? []).length >= 40) return fail("Keep it to 40 skills.", "skill");
    const position = Math.max(-1, ...(existing ?? []).map((s) => s.position)) + 1;
    const { error } = await supabase.from("person_skills").insert({ person_id: id, skill, category, position });
    if (error) return fail("We could not add this skill. Try again.");
    return { ok: true };
  });
}

export async function removeSkill(personId: string | null, skill: string): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    await supabase.from("person_skills").delete().eq("person_id", id).eq("skill", skill);
    return { ok: true };
  });
}

/* ---------------------------------------------------------------- career */
const year = (v: string) => (v ? Number(v) : null);
const validYear = (y: number | null) => y === null || (Number.isInteger(y) && y >= 1950 && y <= 2100);

export async function saveExperience(personId: string | null, entryId: string | null, _prev: Result | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const role = str(form, "role");
    const organization = str(form, "organization");
    const start_year = year(str(form, "start_year"));
    const current = form.get("current") === "on";
    const end_year = current ? null : year(str(form, "end_year"));
    const description = str(form, "description");
    if (!role) return fail("Enter the role or degree.", "role");
    if (start_year === null || !validYear(start_year)) return fail("Enter the start year.", "start_year");
    if (!validYear(end_year)) return fail("Use a year between 1950 and 2100.", "end_year");
    if (!current && end_year === null) return fail("Enter the end year, or tick “I still work here”.", "end_year");
    if (end_year !== null && end_year < start_year) return fail("The end year is before the start year.", "end_year");
    if (description.length > 600) return fail("Keep the description under 600 characters.", "description");
    const row = { person_id: id, role, organization, start_year, end_year, is_education: form.get("is_education") === "on", description: description || null };
    const { error } = isUuid(entryId)
      ? await supabase.from("experiences").update(row).eq("id", entryId).eq("person_id", id)
      : await supabase.from("experiences").insert(row);
    if (error) return fail("We could not save this entry. Try again.");
    return { ok: true, message: "Saved." };
  });
}

export async function deleteExperience(personId: string | null, entryId: string): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    await supabase.from("experiences").delete().eq("id", entryId).eq("person_id", id);
    return { ok: true };
  });
}

/* ---------------------------------------------------------------- achievements */
const KINDS = ["award", "grant", "certificate"] as const;

export async function saveAchievement(personId: string | null, entryId: string | null, _prev: Result | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const title = str(form, "title");
    const organization = str(form, "organization");
    const kindRaw = str(form, "kind");
    const kind = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as (typeof KINDS)[number]) : "award";
    const y = year(str(form, "year"));
    if (!title) return fail("Enter the title.", "title");
    if (y === null || !validYear(y)) return fail("Enter the year.", "year");
    const row = { person_id: id, title: title.slice(0, 200), organization, kind, year: y };
    const { error } = isUuid(entryId)
      ? await supabase.from("achievements").update(row).eq("id", entryId).eq("person_id", id)
      : await supabase.from("achievements").insert(row);
    if (error) return fail("We could not save this entry. Try again.");
    return { ok: true, message: "Saved." };
  });
}

export async function deleteAchievement(personId: string | null, entryId: string): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    await supabase.from("achievements").delete().eq("id", entryId).eq("person_id", id);
    return { ok: true };
  });
}

/* ---------------------------------------------------------------- publications */
export async function savePublication(personId: string | null, pubId: string | null, _prev: Result | null, form: FormData): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const title = str(form, "title");
    const venue = str(form, "venue");
    const kind = str(form, "kind") === "conference" ? "conference" : "journal";
    const y = year(str(form, "year"));
    const doi = cleanDoi(str(form, "doi"));
    const citations = Number(str(form, "citations") || 0);
    const external = str(form, "external_authors")
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    const coauthors = form
      .getAll("coauthors")
      .map(String)
      .filter((c) => isUuid(c) && c !== id)
      .slice(0, 30);

    if (title.length < 3) return fail("Enter the title of the paper.", "title");
    if (y === null || !validYear(y)) return fail("Enter the year it was published.", "year");
    if (doi && !DOI_RE.test(doi)) return fail("A DOI looks like 10.1109/TPAMI.2024.1234.", "doi");
    if (!Number.isInteger(citations) || citations < 0 || citations > 1_000_000) return fail("Citations must be a whole number.", "citations");

    if (doi) {
      let q = supabase.from("publications").select("id").ilike("doi", doi.replace(/[\\%_]/g, "\\$&"));
      if (isUuid(pubId)) q = q.neq("id", pubId);
      const { data: clash } = await q.maybeSingle();
      if (clash) return fail("A paper with this DOI is already in Faculty Atlas. Ask its author to add you as a co-author.", "doi");
    }

    const row = { title: title.slice(0, 400), venue, kind: kind as "journal" | "conference", year: y, doi: doi || null, citations, external_authors: external };

    if (isUuid(pubId)) {
      const { error } = await supabase.from("publications").update(row).eq("id", pubId);
      if (error) return fail("We could not save this paper. Try again.");
      const { data: pub } = await supabase.from("publications").select("created_by").eq("id", pubId).single();
      if (pub?.created_by === id) {
        // The creator manages the co-author list: replace it with the new selection.
        const { data: current } = await supabase.from("publication_authors").select("person_id").eq("publication_id", pubId);
        const keep = new Set([id, ...coauthors]);
        const toRemove = (current ?? []).map((a) => a.person_id).filter((p) => !keep.has(p));
        if (toRemove.length) await supabase.from("publication_authors").delete().eq("publication_id", pubId).in("person_id", toRemove);
        const have = new Set((current ?? []).map((a) => a.person_id));
        const toAdd = coauthors.filter((c) => !have.has(c));
        if (toAdd.length) await supabase.from("publication_authors").insert(toAdd.map((c, i) => ({ publication_id: pubId, person_id: c, author_order: have.size + i + 1 })));
      }
      return { ok: true, message: "Saved." };
    }

    const { data: pub, error } = await supabase.from("publications").insert({ ...row, created_by: id }).select("id").single();
    if (error || !pub) return fail("We could not save this paper. Try again.");
    const authors = [id, ...coauthors].map((person_id, i) => ({ publication_id: pub.id, person_id, author_order: i + 1 }));
    const { error: authorError } = await supabase.from("publication_authors").insert(authors);
    if (authorError) {
      await supabase.from("publications").delete().eq("id", pub.id);
      return fail("We could not save the authors. Try again.");
    }
    return { ok: true, message: "Paper added." };
  });
}

/** The creator deletes the paper for everyone; a co-author only removes themselves. */
export async function deletePublication(personId: string | null, pubId: string): Promise<Result> {
  return run(async () => {
    const { supabase, personId: id } = await target(personId);
    const { data: pub } = await supabase.from("publications").select("created_by").eq("id", pubId).single();
    if (!pub) return fail("This paper no longer exists.");
    if (pub.created_by === id) await supabase.from("publications").delete().eq("id", pubId);
    else await supabase.from("publication_authors").delete().eq("publication_id", pubId).eq("person_id", id);
    return { ok: true };
  });
}

/** Look a paper up on Crossref by DOI to pre-fill the form. Only the DOI is sent. */
export async function lookupDoi(raw: string): Promise<
  { ok: true; title: string; venue: string; year: number | null; kind: "journal" | "conference"; authors: string[]; citations: number } | { ok: false; error: string }
> {
  const account = await getAccount();
  if (!account) return { ok: false, error: "Sign in again to continue." };
  const doi = cleanDoi(raw);
  if (!DOI_RE.test(doi)) return { ok: false, error: "A DOI looks like 10.1109/TPAMI.2024.1234." };
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "FacultyAtlas/0.1 (research profile directory)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { ok: false, error: "No paper was found for this DOI. Check it, or fill in the details yourself." };
    if (!res.ok) return { ok: false, error: "The DOI service is not answering. Fill in the details yourself." };
    const { message: m } = (await res.json()) as {
      message: {
        title?: string[];
        "container-title"?: string[];
        type?: string;
        issued?: { "date-parts"?: number[][] };
        author?: { given?: string; family?: string; name?: string }[];
        "is-referenced-by-count"?: number;
      };
    };
    return {
      ok: true,
      title: (m.title?.[0] ?? "").replace(/\s+/g, " ").trim(),
      venue: m["container-title"]?.[0] ?? "",
      year: m.issued?.["date-parts"]?.[0]?.[0] ?? null,
      kind: m.type === "proceedings-article" ? "conference" : "journal",
      authors: (m.author ?? []).map((a) => a.name ?? [a.given?.[0] ? `${a.given[0]}.` : "", a.family ?? ""].join(" ").trim()).filter(Boolean),
      citations: m["is-referenced-by-count"] ?? 0,
    };
  } catch {
    return { ok: false, error: "The DOI service did not respond in time. Fill in the details yourself." };
  }
}
