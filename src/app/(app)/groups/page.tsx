import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR } from "@/lib/ui";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage(props: PageProps<"/groups">) {
  return (
    <section className="view">
      <Suspense fallback={<p className="muted">Loading groups…</p>}>
        <Groups searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function Groups({ searchParams }: { searchParams: PageProps<"/groups">["searchParams"] }) {
  const account = await requireAccount();
  const showArchived = account.isAdmin && (await searchParams).archived === "1";
  const supabase = await createClient();
  let query = supabase.from("groups").select("id, slug, name, short_code, description, color, archived_at, founded_year, group_members(person_id)").order("name");
  if (!showArchived) query = query.is("archived_at", null);
  const { data: groups } = await query;

  const mine = new Set(
    account.isAdmin ? (groups ?? []).map((g) => g.id) : (groups ?? []).filter((g) => g.group_members.some((m) => m.person_id === account.person?.id)).map((g) => g.id),
  );
  const sorted = [...(groups ?? [])].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Research groups · {sorted.length}</p>
          <h1>Groups</h1>
          <p className="lede">
            {account.isAdmin
              ? "Create groups and bring people in from the directory."
              : "Your groups come first. Other groups are members-only: you can see their names but not their people."}
          </p>
        </div>
        {account.isAdmin && (
          <div className="actions">
            <Link className="btn btn-ghost" href={showArchived ? "/groups" : "/groups?archived=1"}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Link>
            <Link className="btn btn-primary" href="/groups/new">
              <Icon name="plus" />
              New group
            </Link>
          </div>
        )}
      </header>

      {sorted.length === 0 ? (
        <div className="empty glass">
          <Icon name="layers" width={22} height={22} />
          <span>{account.isAdmin ? "No groups yet. Create the first one." : "No groups yet."}</span>
        </div>
      ) : (
        <div className="g-grid">
          {sorted.map((g) => {
            const open = mine.has(g.id);
            return (
              <article key={g.id} className={`g-card glass${open ? "" : " g-locked"}${g.archived_at ? " g-archived" : ""}`} style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }}>
                <Link className="stretch" href={`/groups/${g.slug}`} aria-label={`Open ${g.name}`} />
                <div className="g-top">
                  <span className="g-badge">{g.short_code}</span>
                  <div style={{ minWidth: 0 }}>
                    <h3>{g.name}</h3>
                    <p className="desc">{g.description || "No description yet."}</p>
                  </div>
                </div>
                {open ? (
                  <div className="g-stats">
                    <div>
                      <b>{g.group_members.length}</b>
                      <span>members</span>
                    </div>
                    {g.founded_year && (
                      <div>
                        <b>{g.founded_year}</b>
                        <span>founded</span>
                      </div>
                    )}
                    {g.archived_at && (
                      <span className="chip sm" style={{ ["--c" as string]: "var(--ink-3)" }}>
                        Archived
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="g-lockrow">
                    <Icon name="lock" />
                    <span>Members only. Join this group to see its people and output.</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
