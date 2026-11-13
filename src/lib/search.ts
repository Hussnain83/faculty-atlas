import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { signedUrls } from "@/lib/photos";
import { safeSearch } from "@/lib/ui";

export type SearchPerson = { id: string; name: string; title: string; department: string; photoUrl: string | null; groups: string[]; matchedSkill: string | null };
export type SearchGroup = { slug: string; name: string; shortCode: string; color: string; description: string | null; open: boolean };
export type SearchSkill = { skill: string; people: { id: string; name: string }[] };
export type SearchPaper = { id: string; title: string; venue: string; year: number; authorId: string | null; authorName: string | null };
export type SearchResults = { q: string; people: SearchPerson[]; groups: SearchGroup[]; skills: SearchSkill[]; papers: SearchPaper[] };

/**
 * One search across people, skills, groups and papers.
 * Every query runs as the signed-in user, so row-level security hides anyone they may not see.
 */
export async function runSearch(supabase: SupabaseClient<Database>, raw: string, me: string | null, isAdmin: boolean, limit = 6): Promise<SearchResults> {
  const q = safeSearch(raw).trim();
  if (q.length < 2) return { q, people: [], groups: [], skills: [], papers: [] };
  const like = `%${q}%`;

  const [peopleRes, skillRes, groupRes, paperRes] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, title, department, photo_path, group_members(groups(short_code))")
      .neq("status", "deactivated")
      .or(`full_name.ilike.${like},title.ilike.${like},department.ilike.${like}`)
      .order("full_name")
      .limit(limit * 2),
    supabase.from("person_skills").select("skill, people(id, full_name, title, department, photo_path, status, group_members(groups(short_code)))").ilike("skill", like).limit(60),
    supabase.from("groups").select("slug, name, short_code, color, description, group_members(person_id)").is("archived_at", null).or(`name.ilike.${like},short_code.ilike.${like},description.ilike.${like}`).order("name").limit(limit),
    supabase.from("publications").select("id, title, venue, year, publication_authors(author_order, people(id, full_name))").or(`title.ilike.${like},venue.ilike.${like}`).order("year", { ascending: false }).limit(limit),
  ]);

  type Row = { id: string; full_name: string; title: string; department: string; photo_path: string | null; group_members: { groups: { short_code: string } | null }[] };
  const people = new Map<string, { row: Row; matchedSkill: string | null }>();
  (peopleRes.data ?? []).forEach((p) => people.set(p.id, { row: p, matchedSkill: null }));

  // Skills: group the matches by skill name, and add the people behind them to the people list.
  const bySkill = new Map<string, Map<string, string>>();
  (skillRes.data ?? []).forEach((s) => {
    const p = s.people;
    if (!p || p.status === "deactivated") return;
    const key = s.skill.trim();
    const list = bySkill.get(key.toLowerCase()) ?? new Map<string, string>();
    list.set(p.id, p.full_name);
    bySkill.set(key.toLowerCase(), list);
    if (!people.has(p.id)) people.set(p.id, { row: p, matchedSkill: key });
  });
  const skillNames = new Map((skillRes.data ?? []).map((s) => [s.skill.trim().toLowerCase(), s.skill.trim()]));

  const personList = [...people.values()].slice(0, limit);
  const photos = await signedUrls(supabase, "photos", personList.map((p) => p.row.photo_path));

  return {
    q,
    people: personList.map(({ row, matchedSkill }) => ({
      id: row.id,
      name: row.full_name,
      title: row.title,
      department: row.department,
      photoUrl: photos.get(row.photo_path ?? "") ?? null,
      groups: row.group_members.map((m) => m.groups?.short_code).filter((c): c is string => Boolean(c)),
      matchedSkill,
    })),
    skills: [...bySkill.entries()]
      .map(([key, ppl]) => ({ skill: skillNames.get(key) ?? key, people: [...ppl.entries()].map(([id, name]) => ({ id, name })) }))
      .sort((a, b) => b.people.length - a.people.length || a.skill.localeCompare(b.skill))
      .slice(0, limit),
    groups: (groupRes.data ?? []).map((g) => ({
      slug: g.slug,
      name: g.name,
      shortCode: g.short_code,
      color: g.color,
      description: g.description,
      open: isAdmin || g.group_members.some((m) => m.person_id === me),
    })),
    papers: (paperRes.data ?? []).map((p) => {
      const first = [...p.publication_authors].sort((a, b) => a.author_order - b.author_order).find((a) => a.people)?.people ?? null;
      return { id: p.id, title: p.title, venue: p.venue, year: p.year, authorId: first?.id ?? null, authorName: first?.full_name ?? null };
    }),
  };
}
