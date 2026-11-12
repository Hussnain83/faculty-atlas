"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLORS, slugify, type GroupColor } from "@/lib/validation";

export type GroupFormState = { ok: boolean; message?: string; errors?: Partial<Record<"name" | "short_code" | "description" | "founded_year" | "form", string>> } | null;

function readGroup(form: FormData) {
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  const short_code = String(form.get("short_code") ?? "").trim().toUpperCase();
  const description = String(form.get("description") ?? "").trim();
  const colorRaw = String(form.get("color") ?? "lagoon");
  const color = (GROUP_COLORS as readonly string[]).includes(colorRaw) ? (colorRaw as GroupColor) : "lagoon";
  const yearRaw = String(form.get("founded_year") ?? "").trim();
  const founded_year = yearRaw ? Number(yearRaw) : null;
  const errors: NonNullable<GroupFormState>["errors"] = {};
  if (name.length < 2 || name.length > 120) errors.name = "Give the group a name (2 to 120 characters).";
  if (!/^[A-Z0-9]{1,4}$/.test(short_code)) errors.short_code = "Use 1 to 4 letters or digits, like AI or CV.";
  if (description.length > 600) errors.description = "Keep the description under 600 characters.";
  if (founded_year !== null && (!Number.isInteger(founded_year) || founded_year < 1950 || founded_year > 2100)) {
    errors.founded_year = "Use a year between 1950 and 2100.";
  }
  return { value: { name, short_code, description, color, founded_year }, errors };
}

export async function createGroup(_prev: GroupFormState, form: FormData): Promise<GroupFormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { form: (e as Error).message } };
  }
  const { value, errors } = readGroup(form);
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = await createClient();
  const base = slugify(value.name);
  const { data: taken } = await supabase.from("groups").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((g) => g.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base.slice(0, 36)}-${n}`;

  const { error } = await supabase.from("groups").insert({ ...value, slug });
  if (error) return { ok: false, errors: { form: "We could not create the group. Try again." } };
  redirect(`/groups/${slug}?created=1`);
}

export async function updateGroup(groupId: string, _prev: GroupFormState, form: FormData): Promise<GroupFormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { form: (e as Error).message } };
  }
  const { value, errors } = readGroup(form);
  if (Object.keys(errors).length) return { ok: false, errors };
  const supabase = await createClient();
  const { error } = await supabase.from("groups").update(value).eq("id", groupId);
  if (error) return { ok: false, errors: { form: "We could not save the changes. Try again." } };
  refresh();
  return { ok: true, message: "Changes saved." };
}

export async function setGroupArchived(groupId: string, archived: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("groups").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", groupId);
  refresh();
}

/** Add people to a group. Only people already in the directory can be chosen (the client's rule). */
export async function addMembers(groupId: string, personIds: string[]): Promise<{ ok: boolean; added: number; error?: string }> {
  await requireAdmin();
  const ids = [...new Set(personIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
  if (!ids.length) return { ok: false, added: 0, error: "Choose at least one person." };
  const supabase = await createClient();
  const { data: people } = await supabase.from("people").select("id").in("id", ids).neq("status", "deactivated");
  const valid = (people ?? []).map((p) => p.id);
  if (!valid.length) return { ok: false, added: 0, error: "None of these people can be added." };
  const { error } = await supabase
    .from("group_members")
    .upsert(valid.map((person_id) => ({ group_id: groupId, person_id })), { onConflict: "group_id,person_id", ignoreDuplicates: true });
  if (error) return { ok: false, added: 0, error: "We could not add these people. Try again." };
  refresh();
  return { ok: true, added: valid.length };
}

export async function removeMember(groupId: string, personId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("lead_id").eq("id", groupId).single();
  if (group?.lead_id === personId) await supabase.from("groups").update({ lead_id: null }).eq("id", groupId);
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("person_id", personId);
  refresh();
}

/** The lead must be a member, so setting a lead also adds them if needed. */
export async function setLead(groupId: string, personId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  if (personId) {
    await supabase
      .from("group_members")
      .upsert({ group_id: groupId, person_id: personId }, { onConflict: "group_id,person_id", ignoreDuplicates: true });
  }
  await supabase.from("groups").update({ lead_id: personId }).eq("id", groupId);
  refresh();
}
