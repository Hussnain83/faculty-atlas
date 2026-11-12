import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AboutForm, CvCard, PhotoCard, SkillsEditor } from "@/components/profile/basics";
import { AchievementEditor, CareerEditor, PublicationEditor, type Publication } from "@/components/profile/entries";
import { Icon, type IconName } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { completeness } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage(props: PageProps<"/profile/edit">) {
  return (
    <section className="view">
      <Suspense fallback={<p className="muted">Loading your profile…</p>}>
        <Editor searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

function Section({ id, title, icon, c, children, span = "s12" }: { id: string; title: string; icon: IconName; c?: string; children: React.ReactNode; span?: string }) {
  return (
    <section id={id} className={`card glass ${span} section-anchor`}>
      <h2 className="c-title">
        <span className="ic" style={c ? { ["--c" as string]: c } : undefined}>
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Editor({ searchParams }: { searchParams: PageProps<"/profile/edit">["searchParams"] }) {
  const account = await requireAccount();
  const requested = (await searchParams).person;
  const adminTarget = account.isAdmin && typeof requested === "string" && /^[0-9a-f-]{36}$/i.test(requested) ? requested : null;
  const personId = adminTarget ?? account.person?.id ?? null;

  if (!personId) {
    return (
      <div className="empty glass">
        <Icon name="user" width={22} height={22} />
        <span>
          The Research Office account has no profile of its own. To edit someone&apos;s profile, open them from{" "}
          <Link href="/people" className="af-link">
            People
          </Link>{" "}
          and choose Edit profile.
        </span>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: person }, { data: skills }, { data: experiences }, { data: achievements }, { data: cv }, { data: authored }, { data: colleagues }] = await Promise.all([
    supabase.from("people").select("id, full_name, email, title, department, office, phone_ext, orcid, bio, photo_path").eq("id", personId).maybeSingle(),
    supabase.from("person_skills").select("skill, category").eq("person_id", personId).order("position"),
    supabase.from("experiences").select("id, role, organization, start_year, end_year, is_education, description").eq("person_id", personId),
    supabase.from("achievements").select("id, kind, title, organization, year").eq("person_id", personId),
    supabase.from("cvs").select("file_path, file_name, size_bytes, pages, uploaded_at").eq("person_id", personId).maybeSingle(),
    supabase
      .from("publication_authors")
      .select("publications(id, title, venue, kind, year, doi, citations, external_authors, created_by, publication_authors(person_id, author_order, people(full_name)))")
      .eq("person_id", personId),
    supabase.from("people").select("id, full_name").neq("id", personId).neq("status", "deactivated").order("full_name"),
  ]);

  if (!person) return <div className="empty glass">This person does not exist or you cannot edit them.</div>;

  const [photos, cvLinks] = await Promise.all([signedUrls(supabase, "photos", [person.photo_path]), signedUrls(supabase, "cvs", [cv?.file_path])]);

  const pubs: Publication[] = (authored ?? [])
    .map((row) => row.publications)
    .filter((p) => p !== null)
    .map((p) => {
      const authors = [...p.publication_authors].sort((a, b) => a.author_order - b.author_order);
      return {
        id: p.id,
        title: p.title,
        venue: p.venue,
        kind: p.kind,
        year: p.year,
        doi: p.doi,
        citations: p.citations,
        external_authors: p.external_authors,
        created_by: p.created_by,
        coauthorIds: authors.map((a) => a.person_id).filter((id) => id !== personId),
        authorNames: [...authors.map((a) => a.people?.full_name ?? "A colleague outside your groups"), ...p.external_authors],
      };
    });

  const score = completeness({
    bio: person.bio,
    photoPath: person.photo_path,
    skills: skills?.length ?? 0,
    publications: pubs.length,
    experiences: experiences?.length ?? 0,
    achievements: achievements?.length ?? 0,
    hasCv: Boolean(cv),
  });
  const ring = 2 * Math.PI * 28;
  const forOther = Boolean(adminTarget);

  return (
    <>
      {forOther && (
        <Link className="back" href={`/people/${personId}`}>
          <Icon name="back" />
          {person.full_name}
        </Link>
      )}
      <header className="page-head">
        <div>
          <p className="eyebrow">{forOther ? "Editing as the research office" : "Your profile"}</p>
          <h1>{forOther ? `Edit ${person.full_name}` : "Edit your profile"}</h1>
          <p className="lede">Changes save straight away and are visible to {forOther ? "their" : "your"} colleagues in the same groups.</p>
        </div>
      </header>

      <div className="bento">
        <section id="photo" className="card glass s8 section-anchor">
          <PhotoCard personId={adminTarget} name={person.full_name} photoUrl={photos.get(person.photo_path ?? "") ?? null} />
        </section>
        <section className="card glass s4 complete-card">
          <div className="complete-ring">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={score.score >= 80 ? "var(--mint)" : "var(--saffron)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - score.score / 100)}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <b>{score.score}%</b>
          </div>
          <div style={{ minWidth: 0 }}>
            <b className="complete-title">Profile {score.score === 100 ? "complete" : "strength"}</b>
            {score.missing.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Everything is filled in.
              </p>
            ) : (
              <ul className="next-steps">
                {score.missing.slice(0, 3).map((m) => (
                  <li key={m.label}>
                    <a href={`#${m.section}`}>
                      {m.label} <span className="mono">+{m.points}%</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <Section id="about" title="About" icon="user" span="s7">
          <AboutForm personId={adminTarget} person={person} />
        </Section>
        <Section id="cv" title="Curriculum vitae" icon="file" c="var(--coral)" span="s5">
          <CvCard personId={adminTarget} cv={cv ? { file_name: cv.file_name, size_bytes: cv.size_bytes, pages: cv.pages, uploaded_at: cv.uploaded_at } : null} cvUrl={cvLinks.get(cv?.file_path ?? "") ?? null} />
        </Section>
        <Section id="skills" title="Skills & expertise" icon="spark" c="var(--mint)">
          <SkillsEditor personId={adminTarget} skills={skills ?? []} />
        </Section>
        <Section id="career" title="Career & education" icon="brief" span="s6">
          <CareerEditor personId={adminTarget} entries={experiences ?? []} />
        </Section>
        <Section id="achievements" title="Awards, grants & certificates" icon="award" c="var(--saffron)" span="s6">
          <AchievementEditor personId={adminTarget} entries={achievements ?? []} />
        </Section>
        <Section id="publications" title={`Publications (${pubs.length})`} icon="book" c="var(--iris)">
          <PublicationEditor personId={adminTarget} ownId={personId} pubs={pubs} colleagues={colleagues ?? []} />
        </Section>
      </div>
    </>
  );
}
