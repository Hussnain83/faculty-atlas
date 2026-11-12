// Builds supabase/seed.sql from the approved prototype's sample data (design/prototype.html),
// so the real app starts with the same 15 people, 4 groups and their publications.
// Usage: node scripts/generate-seed.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../design/prototype.html", import.meta.url), "utf8");
const start = html.indexOf("/* ---------- seeded data ---------- */");
const end = html.indexOf("const pubsOf=");
if (start < 0 || end < 0) throw new Error("Could not find the sample data block in design/prototype.html");
const { P, PUBS, GROUPS } = new Function(`${html.slice(start, end)}\nreturn { P, PUBS, GROUPS };`)();

const uid = (key) => {
  const h = createHash("sha1").update(`faculty-atlas:${key}`).digest("hex");
  const variant = (8 + (parseInt(h[16], 16) % 4)).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]` : "'{}'");
const values = (rows) => rows.map((r) => `  (${r.join(", ")})`).join(",\n");

const NOT_ACTIVATED = new Set(["kenji-watanabe", "noura-said"]);
const personId = (id) => uid(`person:${id}`);
const groupId = (id) => uid(`group:${id}`);
const SLUG = { ai: "ai-lab", vision: "computer-vision", data: "data-science", edu: "learning-sciences" };

const people = P.map((p) => [
  q(personId(p.id)), q(p.email), q(p.name), q(p.title), q(p.dept), q(p.office), q(p.ext), q(p.orcid),
  q(p.bio || null), q(p.start), q(NOT_ACTIVATED.has(p.id) ? "invited" : "active"),
]);
const groups = GROUPS.map((g) => [
  q(groupId(g.id)), q(SLUG[g.id]), q(g.name), q(g.short), q(g.desc), q(g.color), q(personId(g.lead)), q(g.since),
]);
const members = P.flatMap((p) => p.groups.map((g) => [q(groupId(g)), q(personId(p.id))]));
const CAT = { Research: "research", Tools: "tools", Teaching: "teaching" };
const skills = P.flatMap((p) =>
  Object.entries(p.skills).flatMap(([cat, list]) => list.map((s, i) => [q(personId(p.id)), q(s), q(CAT[cat]), q(i)])),
);
const experiences = P.flatMap((p) =>
  p.experience.map((e, i) => [
    q(uid(`exp:${p.id}:${i}`)), q(personId(p.id)), q(e.role), q(e.org), q(e.from), q(e.to ?? null), e.edu ? "true" : "false",
    q(e.desc || null),
  ]),
);
const achievements = P.flatMap((p) =>
  p.achievements.map((a, i) => [
    q(uid(`ach:${p.id}:${i}`)), q(personId(p.id)), q(a.kind.toLowerCase()), q(a.title), q(a.org), q(a.year),
  ]),
);
const usedDoi = new Set();
const pubs = PUBS.map((x) => {
  let doi = x.doi;
  while (usedDoi.has(doi)) doi += "x";
  usedDoi.add(doi);
  return [
    q(uid(`pub:${x.id}`)), q(x.title), q(x.venue), q(x.type.toLowerCase()), q(x.year), q(doi), q(x.cites), arr(x.ext),
    q(personId(x.authors[0])),
  ];
});
const authors = PUBS.flatMap((x) => x.authors.map((a, i) => [q(uid(`pub:${x.id}`)), q(personId(a)), q(i + 1)]));

const ACTIVITY = [
  ["amina-raza", "publication", "added a publication", "Whisper-Ur: Robust Urdu Speech Recognition with Low-Rank Adaptation", "2 hours"],
  ["meilin-chen", "cv", "uploaded a new CV", "Mei_Chen_CV_2026.pdf", "1 day"],
  ["kenji-watanabe", "person", "was registered in the directory", "Visiting Researcher · Computer Science", "2 days"],
  ["lukas-berg", "award", "added an achievement", "Best Paper Award, MICCAI", "4 days"],
  ["omar-haddad", "group", "joined a group", "Artificial Intelligence Lab", "7 days"],
].map(([who, kind, summary, subject, ago]) => [q(personId(who)), q(kind), q(summary), q(subject), `now() - interval ${q(ago)}`]);

const sql = `-- =====================================================================
-- Faculty Atlas · SAMPLE DATA for development (generated, do not edit by hand)
-- Source: design/prototype.html via scripts/generate-seed.mjs
-- ${P.length} people · ${GROUPS.length} groups · ${PUBS.length} publications
-- Safe to re-run: fixed ids + "on conflict do nothing". Do not run against
-- the client's production data: the last step resets the activity feed.
-- =====================================================================

insert into public.people (id, email, full_name, title, department, office, phone_ext, orcid, bio, joined_year, status) values
${values(people)}
on conflict (id) do nothing;

insert into public.groups (id, slug, name, short_code, description, color, lead_id, founded_year) values
${values(groups)}
on conflict (id) do nothing;

insert into public.group_members (group_id, person_id) values
${values(members)}
on conflict do nothing;

insert into public.person_skills (person_id, skill, category, position) values
${values(skills)}
on conflict do nothing;

insert into public.experiences (id, person_id, role, organization, start_year, end_year, is_education, description) values
${values(experiences)}
on conflict (id) do nothing;

insert into public.achievements (id, person_id, kind, title, organization, year) values
${values(achievements)}
on conflict (id) do nothing;

insert into public.publications (id, title, venue, kind, year, doi, citations, external_authors, created_by) values
${values(pubs)}
on conflict (id) do nothing;

insert into public.publication_authors (publication_id, person_id, author_order) values
${values(authors)}
on conflict do nothing;

-- The inserts above fire the activity triggers; replace that noise with a realistic feed.
delete from public.activity;
insert into public.activity (actor_id, kind, summary, subject, created_at) values
${values(ACTIVITY)};
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql written: ${P.length} people, ${GROUPS.length} groups, ${members.length} memberships, ${PUBS.length} publications, ${authors.length} author links`);
