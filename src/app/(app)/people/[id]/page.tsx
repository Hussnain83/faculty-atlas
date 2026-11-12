import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileView } from "@/components/profile-view/ProfileView";
import type { ProfileAuthor, ProfileData } from "@/components/profile-view/types";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { completeness } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import "./profile.css";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage(props: PageProps<"/people/[id]">) {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <Profile params={props.params} />
    </Suspense>
  );
}

function ProfileLoading() {
  return (
    <section className="view" aria-busy="true">
      <div className="phero-skeleton glass" />
    </section>
  );
}

function Locked() {
  return (
    <section className="view">
      <Link className="back" href="/people">
        <Icon name="back" />
        People
      </Link>
      <section className="locked glass">
        <span className="lk-sil" aria-hidden="true">
          <Icon name="lock" />
        </span>
        <h1>This profile is only visible to its groups</h1>
        <p>You can see the people who share a research group with you. This person is not in any of your groups, or does not exist.</p>
        <Link className="btn btn-primary" href="/people">
          <Icon name="users" />
          People in your groups
        </Link>
      </section>
    </section>
  );
}

async function Profile({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const account = await requireAccount();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <Locked />;

  const supabase = await createClient();
  // Row-level security returns nothing when the viewer may not see this person.
  const { data: person } = await supabase
    .from("people")
    .select("id, full_name, title, department, email, office, phone_ext, orcid, bio, photo_path, joined_year, status, group_members(groups(id, slug, name, short_code, color, archived_at))")
    .eq("id", id)
    .maybeSingle();
  if (!person) return <Locked />;

  const [{ data: skills }, { data: experiences }, { data: achievements }, { data: cv }, { data: pubs }] = await Promise.all([
    supabase.from("person_skills").select("skill, category").eq("person_id", id).order("position"),
    supabase.from("experiences").select("id, role, organization, start_year, end_year, is_education, description").eq("person_id", id),
    supabase.from("achievements").select("id, kind, title, organization, year").eq("person_id", id),
    supabase.from("cvs").select("file_path, file_name, size_bytes, pages, uploaded_at").eq("person_id", id).maybeSingle(),
    supabase.rpc("person_publications", { pid: id }),
  ]);

  type RawAuthor = { id: string | null; name: string; photo: string | null };
  const rawPubs = (pubs ?? []).map((p) => ({ ...p, authors: (p.authors as RawAuthor[] | null) ?? [] }));
  const [photos, cvLinks] = await Promise.all([
    signedUrls(supabase, "photos", [person.photo_path, ...rawPubs.flatMap((p) => p.authors.map((a) => a.photo))]),
    signedUrls(supabase, "cvs", [cv?.file_path]),
  ]);

  const isOwn = account.person?.id === id;
  const data: ProfileData = {
    id: person.id,
    name: person.full_name,
    title: person.title,
    department: person.department,
    email: String(person.email),
    office: person.office,
    phone_ext: person.phone_ext,
    orcid: person.orcid,
    bio: person.bio,
    photoUrl: photos.get(person.photo_path ?? "") ?? null,
    joinedYear: person.joined_year,
    status: person.status,
    groups: person.group_members
      .map((m) => m.groups)
      .filter((g) => g !== null && !g.archived_at)
      .map((g) => ({ id: g!.id, slug: g!.slug, name: g!.name, short_code: g!.short_code, color: g!.color })),
    skills: skills ?? [],
    experiences: experiences ?? [],
    achievements: achievements ?? [],
    publications: rawPubs.map((p) => ({
      id: p.id,
      title: p.title,
      venue: p.venue,
      kind: p.kind,
      year: p.year,
      doi: p.doi,
      citations: p.citations,
      external_authors: p.external_authors,
      authors: p.authors.map((a): ProfileAuthor => ({ id: a.id, name: a.name, photo: a.photo ? (photos.get(a.photo) ?? null) : null })),
    })),
    cv: cv ? { fileName: cv.file_name, sizeBytes: cv.size_bytes, pages: cv.pages, uploadedAt: cv.uploaded_at, url: cvLinks.get(cv.file_path) ?? null } : null,
    completeness: completeness({
      bio: person.bio,
      photoPath: person.photo_path,
      skills: skills?.length ?? 0,
      publications: rawPubs.length,
      experiences: experiences?.length ?? 0,
      achievements: achievements?.length ?? 0,
      hasCv: Boolean(cv),
    }).score,
    canEdit: isOwn || account.isAdmin,
    isOwn,
    isAdminView: account.isAdmin,
    thisYear: new Date().getFullYear(),
  };
  return <ProfileView data={data} />;
}
