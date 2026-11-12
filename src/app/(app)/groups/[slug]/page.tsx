import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { removeMember, setGroupArchived, setLead, updateGroup } from "@/app/(app)/groups/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { GroupForm } from "@/components/admin/GroupForm";
import { MemberPicker } from "@/components/admin/MemberPicker";
import { Icon } from "@/components/ui/Icon";
import { initials, requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR, STATUS_LABEL } from "@/lib/ui";

export const metadata: Metadata = { title: "Group" };

export default function GroupPage(props: PageProps<"/groups/[slug]">) {
  return (
    <section className="view">
      <Link className="back" href="/groups">
        <Icon name="back" />
        All groups
      </Link>
      <Suspense fallback={<p className="muted">Loading the group…</p>}>
        <Group params={props.params} searchParams={props.searchParams} />
      </Suspense>
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
    .select("id, slug, name, short_code, description, color, lead_id, founded_year, archived_at, group_members(person_id, added_at, people(id, full_name, title, department, status))")
    .eq("slug", slug)
    .maybeSingle();

  if (!group) {
    return (
      <div className="empty glass">
        <Icon name="layers" width={22} height={22} />
        <span>This group does not exist, or it has been archived.</span>
      </div>
    );
  }

  const isMember = account.isAdmin || group.group_members.some((m) => m.person_id === account.person?.id);
  const color = GROUP_COLOR_VAR[group.color];
  const members = group.group_members
    .map((m) => m.people)
    .filter((p) => p !== null)
    .sort((a, b) => Number(b.id === group.lead_id) - Number(a.id === group.lead_id) || a.full_name.localeCompare(b.full_name));
  const lead = members.find((m) => m.id === group.lead_id);

  const header = (
    <header className="page-head">
      <div className="who-head">
        <span className="g-badge" style={{ ["--c" as string]: color, width: 72, height: 72, borderRadius: 22, fontSize: 22 }}>
          {group.short_code}
        </span>
        <div>
          <p className="eyebrow">Research group{group.founded_year ? ` · since ${group.founded_year}` : ""}</p>
          <h1>{group.name}</h1>
          <p className="lede">{group.description || "No description yet."}</p>
          <div className="chips" style={{ marginTop: 10 }}>
            {isMember && (
              <span className="chip" style={{ ["--c" as string]: color }}>
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            )}
            {lead && (
              <span className="chip" style={{ ["--c" as string]: "var(--saffron)" }}>
                Led by {lead.full_name}
              </span>
            )}
            {group.archived_at && (
              <span className="chip" style={{ ["--c" as string]: "var(--ink-3)" }}>
                Archived
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  if (!isMember) {
    return (
      <>
        {header}
        <section className="locked glass">
          <span className="lk-sil" aria-hidden="true">
            <Icon name="lock" />
          </span>
          <h1>Members only</h1>
          <p>Only members of this group can see its people, publications and dashboard. You are not a member yet.</p>
        </section>
      </>
    );
  }

  let candidates: { id: string; full_name: string; title: string; department: string; status: string }[] = [];
  if (account.isAdmin) {
    const memberIds = new Set(members.map((m) => m.id));
    const { data } = await supabase.from("people").select("id, full_name, title, department, status").neq("status", "deactivated").order("full_name");
    candidates = (data ?? []).filter((p) => !memberIds.has(p.id));
  }

  return (
    <>
      {created && (
        <div className="hint" role="status">
          <Icon name="check" />
          <span>
            <b>{group.name}</b> is ready. Add members from the directory below, then choose a lead.
          </span>
        </div>
      )}
      {header}

      <div className="bento">
        <section className={`card glass ${account.isAdmin ? "s7" : "s12"}`}>
          <div className="c-head">
            <h2 className="c-title">
              <span className="ic" style={{ ["--c" as string]: color }}>
                <Icon name="users" />
              </span>
              Members
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>
              The 3D collaboration map arrives in Phase 6
            </span>
          </div>
          {members.length === 0 ? (
            <div className="empty">No members yet.{account.isAdmin ? " Add people from the directory." : ""}</div>
          ) : (
            <ul className="member-rows">
              {members.map((m) => (
                <li key={m.id}>
                  <Link href={`/people/${m.id}`} className="who">
                    <span className="av" style={{ ["--s" as string]: "38px" }} aria-hidden="true">
                      {initials(m.full_name)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <b>
                        {m.full_name}
                        {m.id === group.lead_id && (
                          <span className="chip sm" style={{ ["--c" as string]: "var(--saffron)", marginLeft: 8 }}>
                            Lead
                          </span>
                        )}
                        {m.status !== "active" && (
                          <span className="chip sm" style={{ ["--c" as string]: STATUS_LABEL[m.status].color, marginLeft: 8 }}>
                            {STATUS_LABEL[m.status].label}
                          </span>
                        )}
                      </b>
                      <small>{[m.title, m.department].filter(Boolean).join(" · ")}</small>
                    </span>
                  </Link>
                  {account.isAdmin && (
                    <span className="row-actions">
                      {m.id !== group.lead_id && (
                        <ConfirmButton run={setLead.bind(null, group.id, m.id)} label="Make lead" confirmLabel="Yes" question={`Make ${m.full_name} the lead?`} />
                      )}
                      <ConfirmButton
                        run={removeMember.bind(null, group.id, m.id)}
                        label="Remove"
                        confirmLabel="Remove"
                        question={`Remove ${m.full_name} from ${group.short_code}?`}
                        danger
                      />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {account.isAdmin && (
          <section className="card glass s5">
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
        )}

        {account.isAdmin && (
          <section className="card glass s12">
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
        )}
      </div>
    </>
  );
}
