import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { initials, requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "People" };

const COLOR: Record<string, string> = {
  lagoon: "var(--lagoon)",
  coral: "var(--coral)",
  iris: "var(--iris)",
  saffron: "var(--saffron)",
  mint: "var(--mint)",
};

export default function PeoplePage() {
  return (
    <section className="view">
      <Suspense fallback={<Header admin={false} count={null} />}>
        <PeopleList />
      </Suspense>
    </section>
  );
}

function Header({ admin, count }: { admin: boolean; count: number | null }) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">People directory{count !== null ? ` · ${count}` : ""}</p>
        <h1>{admin ? "Everyone at the faculty" : "People in your groups"}</h1>
        <p className="lede">
          {admin
            ? "Only people registered here can join a group. Registering people and CSV import arrive in Phase 3."
            : "You can see everyone who shares a research group with you. Everyone else stays private."}
        </p>
      </div>
    </header>
  );
}

/** The list comes straight from the database; row-level security removes anyone you may not see. */
async function PeopleList() {
  const account = await requireAccount();
  const supabase = await createClient();
  const { data: people, error } = await supabase
    .from("people")
    .select("id, full_name, title, department, status, group_members(groups(short_code, color))")
    .order("full_name");

  if (error) {
    return (
      <>
        <Header admin={account.isAdmin} count={null} />
        <div className="empty glass">We could not load the directory. Refresh the page to try again.</div>
      </>
    );
  }

  return (
    <>
      <Header admin={account.isAdmin} count={people.length} />
      {!account.isAdmin && (
        <div className="hint">
          <Icon name="lock" />
          <span>
            You can see {Math.max(0, people.length - 1)} {people.length === 2 ? "colleague" : "colleagues"} who share a research group with you.
            Everyone else stays private until you join their group.
          </span>
        </div>
      )}
      <ul className="people-list">
        {people.map((p) => {
          const groups = p.group_members.map((m) => m.groups).filter((g) => g !== null);
          return (
            <li key={p.id} className="glass">
              <span className="av" style={{ ["--s" as string]: "44px" }} aria-hidden="true">
                {initials(p.full_name)}
              </span>
              <span style={{ minWidth: 0 }}>
                <b>{p.full_name}</b>
                <small>
                  {p.title} · {p.department}
                </small>
                <span className="chips">
                  {groups.map((g) => (
                    <span key={g.short_code} className="chip" style={{ ["--c" as string]: COLOR[g.color] ?? "var(--lagoon)", height: 22, fontSize: 11.5 }}>
                      {g.short_code}
                    </span>
                  ))}
                  {p.status === "invited" && (
                    <span className="chip" style={{ ["--c" as string]: "var(--saffron)", height: 22, fontSize: 11.5 }}>
                      Not activated
                    </span>
                  )}
                  {p.id === account.person?.id && (
                    <span className="chip" style={{ ["--c" as string]: "var(--mint)", height: 22, fontSize: 11.5 }}>
                      You
                    </span>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
