import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { removeMember, setGroupArchived, setLead, updateGroup } from "@/app/(app)/groups/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { GroupForm } from "@/components/admin/GroupForm";
import { MemberPicker } from "@/components/admin/MemberPicker";
import { GroupView } from "@/components/group-view/GroupView";
import type { GroupData } from "@/components/group-view/types";
import type { ProfileAuthor } from "@/components/profile-view/types";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { completeness } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR } from "@/lib/ui";
import "@/components/profile-view/profile.css";
import "@/components/group-view/group.css";

export const metadata: Metadata = { title: "Group" };

export default function GroupPage(props: PageProps<"/groups/[slug]">) {
  return (
    <Suspense fallback={<GroupLoading />}>
      <Group params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function GroupLoading() {
  return (
    <section className="view" aria-busy="true">
      <div className="phero-skeleton glass" />
    </section>
  );
}

function Missing() {
  return (
    <section className="view">
      <Link className="back" href="/groups">
        <Icon name="back" />
        All groups
      </Link>
      <div className="empty glass">
        <Icon name="layers" width={22} height={22} />
        <span>This group does not exist, or it has been archived.</span>
      </div>
    </section>
  );
}

async function Group({ params, searchParams }: { params: PageProps<"/groups/[slug]">["params"]; searchParams: PageProps<"/groups/[slug]">["searchParams"] }) {
  const account = await requireAccount();
  const { slug } = await params;
  const created = (await searchParams).created === "1";
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, slug, name, short_code, description, color, lead_id, founded_year, archived_at, group_members(person_id, people(id, full_name, title, department, status, photo_path, bio))")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) return <Missing />;

  const isMember = account.isAdmin || group.group_members.some((m) => m.person_id === account.person?.id);
  const color = GROUP_COLOR_VAR[group.color];

  // Everyone can see group names; only members and admins see who is in it and what they published.
  if (!isMember) {
    return (
      <section className="view">
        <Link className="back" href="/groups">
          <Icon name="back" />
          All groups
        </Link>
        <header className="page-head">
          <div className="who-head">
            <span className="g-badge" style={{ ["--c" as string]: color, width: 72, height: 72, borderRadius: 22, fontSize: 22 }}>
              {group.short_code}
            </span>
            <div>
              <p className="eyebrow">Research group{group.founded_year ? ` · since ${group.founded_year}` : ""}</p>
              <h1>{group.name}</h1>
              <p className="lede">{group.description || "No description yet."}</p>
            </div>
          </div>
        </header>
        <section className="locked glass">
          <span className="lk-sil" aria-hidden="true">
            <Icon name="lock" />
          </span>
          <h1>Members only</h1>
          <p>Only members of this group can see its people, publications and dashboard. You are not a member yet.</p>
        </section>
      </section>
    );
  }

  const people = group.group_members.map((m) => m.people).filter((p) => p !== null);
  const ids = people.map((p) => p.id);
  const none = ["00000000-0000-0000-0000-000000000000"];
  const [{ data: skills }, { data: exps }, { data: achs }, { data: cvs }, { data: pubs }, directory] = await Promise.all([
    supabase.from("person_skills").select("person_id, skill, position").in("person_id", ids.length ? ids : none).order("position"),
    supabase.from("experiences").select("person_id").in("person_id", ids.length ? ids : none),
    supabase.from("achievements").select("person_id").in("person_id", ids.length ? ids : none),
    supabase.from("cvs").select("person_id").in("person_id", ids.length ? ids : none),
    supabase.rpc("group_publications", { gid: group.id }),
    account.isAdmin ? supabase.from("people").select("id", { count: "exact", head: true }).neq("status", "deactivated") : Promise.resolve({ count: null }),
  ]);

  const count = (rows: { person_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.person_id === id).length;
  type RawAuthor = { id: string | null; name: string; photo: string | null };
  const rawPubs = (pubs ?? []).map((p) => ({ ...p, authors: (p.authors as RawAuthor[] | null) ?? [] }));
  const photos = await signedUrls(supabase, "photos", [...people.map((p) => p.photo_path), ...rawPubs.flatMap((p) => p.authors.map((a) => a.photo))]);
  const paperCount = new Map<string, number>();
  rawPubs.forEach((p) => p.member_ids.forEach((id) => paperCount.set(id, (paperCount.get(id) ?? 0) + 1)));

  const data: GroupData = {
    id: group.id,
    slug: group.slug,
    name: group.name,
    shortCode: group.short_code,
    description: group.description,
    color: group.color,
    foundedYear: group.founded_year,
    archived: Boolean(group.archived_at),
    members: people
      .map((p) => {
        const mine = (skills ?? []).filter((s) => s.person_id === p.id);
        return {
          id: p.id,
          name: p.full_name,
          title: p.title,
          department: p.department,
          status: p.status,
          photoUrl: photos.get(p.photo_path ?? "") ?? null,
          isLead: p.id === group.lead_id,
          skills: mine.map((s) => s.skill),
          completeness: completeness({
            bio: p.bio,
            photoPath: p.photo_path,
            skills: mine.length,
            publications: paperCount.get(p.id) ?? 0,
            experiences: count(exps, p.id),
            achievements: count(achs, p.id),
            hasCv: count(cvs, p.id) > 0,
          }).score,
        };
      })
      .sort((a, b) => Number(b.isLead) - Number(a.isLead) || a.name.localeCompare(b.name)),
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
      memberIds: p.member_ids,
    })),
    directorySize: directory.count ?? null,
    isAdmin: account.isAdmin,
    thisYear: new Date().getFullYear(),
  };

  if (!account.isAdmin) return <GroupView data={data} />;

  // ---------- admin tools ----------
  const memberIds = new Set(ids);
  const { data: everyone } = await supabase.from("people").select("id, full_name, title, department, status").neq("status", "deactivated").order("full_name");
  const candidates = (everyone ?? []).filter((p) => !memberIds.has(p.id));
  const memberActions = Object.fromEntries(
    data.members.map((m) => [
      m.id,
      <>
        {!m.isLead && <ConfirmButton run={setLead.bind(null, group.id, m.id)} label="Make lead" confirmLabel="Yes" question={`Make ${m.name} the lead?`} />}
        <ConfirmButton run={removeMember.bind(null, group.id, m.id)} label="Remove" confirmLabel="Remove" question={`Remove ${m.name} from ${group.short_code}?`} danger />
      </>,
    ]),
  );

  return (
    <GroupView
      data={data}
      memberActions={memberActions}
      headerActions={
        <>
          <a className="btn btn-primary" href="#add-members">
            <Icon name="plus" />
            Add members
          </a>
          <a className="btn btn-ghost" href="#group-details">
            <Icon name="edit" />
            Edit details
          </a>
        </>
      }
    >
      {created && (
        <div className="hint" role="status">
          <Icon name="check" />
          <span>
            <b>{group.name}</b> is ready. Add members from the directory below, then choose a lead.
          </span>
        </div>
      )}
      <div className="bento g-admin">
        <section className="card glass s5" id="add-members">
          <h2 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--mint)" }}>
              <Icon name="plus" />
            </span>
            Add members
          </h2>
          <p className="muted" style={{ fontSize: 13, marginTop: -8 }}>
            Only people registered in the directory can join.
          </p>
          <MemberPicker groupId={group.id} candidates={candidates} />
        </section>
        <section className="card glass s7" id="group-details">
          <div className="c-head">
            <h2 className="c-title">
              <span className="ic">
                <Icon name="edit" />
              </span>
              Group details
            </h2>
            {group.archived_at ? (
              <ConfirmButton run={setGroupArchived.bind(null, group.id, false)} label="Restore group" confirmLabel="Yes, restore" question="Make this group active again?" />
            ) : (
              <ConfirmButton
                run={setGroupArchived.bind(null, group.id, true)}
                label="Archive group"
                confirmLabel="Yes, archive"
                question="Members keep their data, but the group disappears from lists. Continue?"
                danger
              />
            )}
          </div>
          <GroupForm action={updateGroup.bind(null, group.id)} group={group} submitLabel="Save changes" />
        </section>
      </div>
    </GroupView>
  );
}
