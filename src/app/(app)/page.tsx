import { Suspense } from "react";
import { OverviewView } from "@/components/overview/OverviewView";
import type { OverviewData, OvActivity, OvPerson } from "@/components/overview/types";
import { type Account, requireAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { completeness } from "@/lib/profile";
import { hIndex, yearSeries } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import "@/components/profile-view/profile.css";
import "@/components/group-view/group.css";
import "@/components/overview/overview.css";

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <section className="view" aria-busy="true">
          <div className="phero-skeleton glass" />
        </section>
      }
    >
      <Overview />
    </Suspense>
  );
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Everything comes from the database as the signed-in person, so row-level security limits members to their groups. */
async function Overview() {
  const account = await requireAccount();
  return <OverviewView data={await loadOverview(account, new Date().getTime())} />;
}

async function loadOverview(account: Account, now: number): Promise<OverviewData> {
  const supabase = await createClient();
  const thisYear = new Date(now).getFullYear();

  const [{ data: people }, { data: groups }, { data: authorship }, { data: cvs }, { data: skills }, { data: exps }, { data: achs }, { data: activity }] = await Promise.all([
    supabase.from("people").select("id, full_name, title, bio, photo_path, status, group_members(group_id)").neq("status", "deactivated").order("full_name"),
    supabase.from("groups").select("id, slug, name, short_code, color, description, group_members(person_id)").is("archived_at", null).order("name"),
    supabase.from("publication_authors").select("person_id, publications(id, year, citations)"),
    supabase.from("cvs").select("person_id"),
    supabase.from("person_skills").select("person_id"),
    supabase.from("experiences").select("person_id"),
    supabase.from("achievements").select("person_id"),
    supabase.from("activity").select("id, kind, summary, subject, created_at, people(id, full_name, photo_path)").order("created_at", { ascending: false }).limit(40),
  ]);

  const ppl = people ?? [];
  const visible = new Set(ppl.map((p) => p.id));
  const tally = (rows: { person_id: string }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.person_id, (m.get(r.person_id) ?? 0) + 1));
    return m;
  };
  const nSkills = tally(skills), nExps = tally(exps), nAchs = tally(achs), nCvs = tally(cvs);

  // Papers per person, and the unique papers by anyone visible.
  const byPerson = new Map<string, number[]>();
  const papers = new Map<string, { year: number; authors: Set<string> }>();
  (authorship ?? []).forEach((a) => {
    const pub = a.publications;
    if (!pub || !visible.has(a.person_id)) return;
    byPerson.set(a.person_id, [...(byPerson.get(a.person_id) ?? []), pub.citations]);
    const entry = papers.get(pub.id) ?? { year: pub.year, authors: new Set<string>() };
    entry.authors.add(a.person_id);
    papers.set(pub.id, entry);
  });
  const paperList = [...papers.values()];

  const photos = await signedUrls(supabase, "photos", [...ppl.map((p) => p.photo_path), ...(activity ?? []).map((a) => a.people?.photo_path)]);
  const photo = (path: string | null | undefined) => (path ? (photos.get(path) ?? null) : null);

  const persons: OvPerson[] = ppl.map((p) => {
    const cites = byPerson.get(p.id) ?? [];
    const c = completeness({
      bio: p.bio,
      photoPath: p.photo_path,
      skills: nSkills.get(p.id) ?? 0,
      publications: cites.length,
      experiences: nExps.get(p.id) ?? 0,
      achievements: nAchs.get(p.id) ?? 0,
      hasCv: (nCvs.get(p.id) ?? 0) > 0,
    });
    return {
      id: p.id,
      name: p.full_name,
      title: p.title,
      photoUrl: photo(p.photo_path),
      papers: cites.length,
      cites: cites.reduce((s, v) => s + v, 0),
      h: hIndex(cites),
      completeness: c.score,
      nextStep: c.missing[0]?.label ?? null,
      nextPoints: c.missing[0]?.points ?? 0,
      groups: p.group_members.length,
    };
  });
  const byId = new Map(persons.map((p) => [p.id, p]));

  const meRow = account.person ? ppl.find((p) => p.id === account.person!.id) : undefined;
  const mePerson = meRow ? byId.get(meRow.id) : undefined;
  const meMissing = meRow
    ? completeness({
        bio: meRow.bio,
        photoPath: meRow.photo_path,
        skills: nSkills.get(meRow.id) ?? 0,
        publications: mePerson?.papers ?? 0,
        experiences: nExps.get(meRow.id) ?? 0,
        achievements: nAchs.get(meRow.id) ?? 0,
        hasCv: (nCvs.get(meRow.id) ?? 0) > 0,
      }).missing.map((m) => ({ label: m.label, points: m.points }))
    : [];

  const groupList = (groups ?? []).map((g) => {
    const ids = new Set(g.group_members.map((m) => m.person_id));
    const open = account.isAdmin || (account.person ? ids.has(account.person.id) : false);
    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      shortCode: g.short_code,
      color: g.color,
      description: g.description,
      open,
      members: ids.size,
      papers: open ? paperList.filter((x) => [...x.authors].some((a) => ids.has(a))).length : 0,
      faces: open ? [...ids].map((id) => byId.get(id)).filter((p): p is OvPerson => Boolean(p)).slice(0, 3).map((p) => ({ name: p.name, photoUrl: p.photoUrl })) : [],
    };
  });

  const acts: OvActivity[] = (activity ?? [])
    .filter((a) => !a.people || visible.has(a.people.id))
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      summary: a.summary,
      subject: a.subject,
      when: ago(a.created_at, now),
      who: a.people ? { id: a.people.id, name: a.people.full_name, photoUrl: photo(a.people.photo_path) } : null,
    }));

  const greeting = account.isAdmin && !account.person ? "Research office" : (account.person?.fullName ?? "").replace(/^(Dr\.|Prof\.)\s+/, "").split(" ")[0] || "there";

  return {
    isAdmin: account.isAdmin,
    greeting,
    today: new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    thisYear,
    me: mePerson ? { ...mePerson, missing: meMissing } : null,
    people: persons,
    groups: groupList,
    years: yearSeries(paperList, thisYear - 9, thisYear),
    totals: {
      people: persons.length,
      papers: paperList.length,
      papersThisYear: paperList.filter((x) => x.year === thisYear).length,
      cvs: persons.filter((p) => (nCvs.get(p.id) ?? 0) > 0).length,
      inGroups: persons.filter((p) => p.groups > 0).length,
      memberships: groupList.reduce((s, g) => s + g.members, 0),
      myGroups: groupList.filter((g) => g.open).length,
    },
    activity: acts,
  };
}
