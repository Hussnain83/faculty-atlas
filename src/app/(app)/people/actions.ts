"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ensureAuthUser, requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validatePerson, type PersonInput } from "@/lib/validation";

export type FormState = { ok: boolean; message?: string; errors?: Partial<Record<keyof PersonInput | "form", string>> } | null;

const fromForm = (form: FormData): Partial<PersonInput> => ({
  full_name: String(form.get("full_name") ?? ""),
  email: String(form.get("email") ?? ""),
  title: String(form.get("title") ?? ""),
  department: String(form.get("department") ?? ""),
  office: String(form.get("office") ?? ""),
  phone_ext: String(form.get("phone_ext") ?? ""),
  joined_year: String(form.get("joined_year") ?? ""),
});

/** Register one person. They get a sign-in account without a password and activate it themselves. */
export async function registerPerson(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { form: (e as Error).message } };
  }
  const { value, errors } = validatePerson(fromForm(form));
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("people").select("id").eq("email", value.email).maybeSingle();
  if (existing) return { ok: false, errors: { email: "This email is already in the directory." } };

  const { data: person, error } = await supabase.from("people").insert(value).select("id").single();
  if (error || !person) return { ok: false, errors: { form: "We could not save this person. Try again." } };

  try {
    const userId = await ensureAuthUser(value.email);
    await supabase.from("people").update({ user_id: userId }).eq("id", person.id);
  } catch {
    // The directory entry exists; the account can be created later by re-saving the person.
  }

  const groupIds = form.getAll("groups").map(String).filter(Boolean);
  if (groupIds.length) {
    await supabase.from("group_members").insert(groupIds.map((group_id) => ({ group_id, person_id: person.id })));
  }
  redirect(`/people/${person.id}/manage?created=1`);
}

export async function updatePerson(personId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { form: (e as Error).message } };
  }
  const { value, errors } = validatePerson(fromForm(form));
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = await createClient();
  const { data: current } = await supabase.from("people").select("id, email, user_id").eq("id", personId).single();
  if (!current) return { ok: false, errors: { form: "This person no longer exists." } };

  if (value.email !== current.email) {
    const { data: clash } = await supabase.from("people").select("id").eq("email", value.email).neq("id", personId).maybeSingle();
    if (clash) return { ok: false, errors: { email: "Another person already uses this email." } };
    if (current.user_id) {
      const { error } = await createAdminClient().auth.admin.updateUserById(current.user_id, { email: value.email, email_confirm: true });
      if (error) return { ok: false, errors: { email: "The sign-in email could not be changed. Try a different address." } };
    }
  }

  const { error } = await supabase.from("people").update(value).eq("id", personId);
  if (error) return { ok: false, errors: { form: "We could not save the changes. Try again." } };

  if (!current.user_id) {
    try {
      const userId = await ensureAuthUser(value.email);
      await supabase.from("people").update({ user_id: userId }).eq("id", personId);
    } catch {
      /* retried on the next save */
    }
  }
  refresh();
  return { ok: true, message: "Changes saved." };
}

/**
 * Deactivate: the person keeps their data but can no longer sign in or see anything.
 * Reactivate: back to active if they had activated before, otherwise back to invited.
 */
export async function setPersonActive(personId: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: person } = await supabase.from("people").select("user_id").eq("id", personId).single();
  if (!person) return;

  let status: "active" | "invited" | "deactivated" = "deactivated";
  if (active) {
    let everSignedIn = false;
    if (person.user_id) {
      const { data } = await admin.auth.admin.getUserById(person.user_id);
      everSignedIn = Boolean(data.user?.last_sign_in_at);
    }
    status = everSignedIn ? "active" : "invited";
  }
  await supabase.from("people").update({ status }).eq("id", personId);
  if (person.user_id) {
    await admin.auth.admin.updateUserById(person.user_id, { ban_duration: active ? "none" : "876000h" });
  }
  refresh();
}

export type ImportRow = Partial<PersonInput> & { groups?: string };
export type ImportResult = { ok: true; created: number; skipped: { row: number; email: string; reason: string }[] } | { ok: false; error: string };

/** Bulk import from CSV. Rows are re-validated here; duplicates and bad rows are skipped, not fatal. */
export async function importPeople(rows: ImportRow[]): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "The file has no rows to import." };
  if (rows.length > 1000) return { ok: false, error: "Import up to 1,000 people at a time." };

  const supabase = await createClient();
  const [{ data: existing }, { data: groups }] = await Promise.all([
    supabase.from("people").select("email"),
    supabase.from("groups").select("id, short_code, slug, name"),
  ]);
  const known = new Set((existing ?? []).map((p) => String(p.email).toLowerCase()));
  const groupByKey = new Map<string, string>();
  (groups ?? []).forEach((g) => [g.short_code, g.slug, g.name].forEach((k) => groupByKey.set(k.toLowerCase(), g.id)));

  const skipped: { row: number; email: string; reason: string }[] = [];
  const valid: { value: ReturnType<typeof validatePerson>["value"]; groups: string[] }[] = [];
  rows.forEach((raw, i) => {
    const { value, errors } = validatePerson(raw);
    const firstError = Object.values(errors)[0];
    if (firstError) return skipped.push({ row: i + 2, email: value.email, reason: firstError });
    if (known.has(value.email)) return skipped.push({ row: i + 2, email: value.email, reason: "Already in the directory" });
    known.add(value.email);
    const groupIds = String(raw.groups ?? "")
      .split(/[;|]/)
      .map((g) => groupByKey.get(g.trim().toLowerCase()))
      .filter((g): g is string => Boolean(g));
    valid.push({ value, groups: groupIds });
  });

  if (valid.length) {
    const { data: inserted, error } = await supabase
      .from("people")
      .insert(valid.map((v) => v.value))
      .select("id, email");
    if (error || !inserted) return { ok: false, error: "The import failed and nothing was saved. Check the file and try again." };

    const idByEmail = new Map(inserted.map((p) => [String(p.email).toLowerCase(), p.id]));
    const memberships = valid.flatMap((v) => v.groups.map((group_id) => ({ group_id, person_id: idByEmail.get(v.value.email)! })));
    if (memberships.length) await supabase.from("group_members").insert(memberships);

    for (const p of inserted) {
      try {
        const userId = await ensureAuthUser(String(p.email));
        await supabase.from("people").update({ user_id: userId }).eq("id", p.id);
      } catch {
        /* the account is created on the next save of this person */
      }
    }
  }
  refresh();
  return { ok: true, created: valid.length, skipped };
}
