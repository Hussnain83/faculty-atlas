import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Highlight } from "@/components/shell/GlobalSearch";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { runSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR } from "@/lib/ui";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <section className="view">
      <Suspense fallback={<p className="muted">Searching…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const account = await requireAccount();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw : "";
  const supabase = await createClient();
  const r = await runSearch(supabase, q, account.person?.id ?? null, account.isAdmin, 24);
  const total = r.people.length + r.groups.length + r.skills.length + r.papers.length;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Search{r.q ? ` · ${total} ${total === 1 ? "result" : "results"}` : ""}</p>
          <h1>{r.q ? <>Results for “{r.q}”</> : "Search the faculty"}</h1>
          <p className="lede">
            {account.isAdmin ? "Searching everyone in the directory." : "Searching the people and papers in your groups. Other groups show by name only."}
          </p>
        </div>
      </header>

      <form className="toolbar glass" action="/search" role="search">
        <div className="search" style={{ flex: "1 1 260px", height: 42, boxShadow: "none" }}>
          <Icon name="search" width={17} height={17} />
          <label className="sr-only" htmlFor="search-q">
            Search
          </label>
          <input id="search-q" name="q" defaultValue={r.q} placeholder="A name, skill, group, paper or venue" autoComplete="off" />
        </div>
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {r.q.length < 2 ? (
        <div className="empty glass">
          <Icon name="search" width={22} height={22} />
          <span>Type at least two letters. You can search names, titles, departments, skills, groups, paper titles and venues.</span>
        </div>
      ) : total === 0 ? (
        <div className="empty glass">
          <Icon name="search" width={22} height={22} />
          <span>Nothing matches “{r.q}” among the people and groups you can see.</span>
        </div>
      ) : (
        <div className="bento">
          {r.people.length > 0 && (
            <section className="card glass s7 sr-sec">
              <h2 className="c-title">
                <span className="ic">
                  <Icon name="users" />
                </span>
                People · {r.people.length}
              </h2>
              <ul className="sr-list">
                {r.people.map((p) => (
                  <li key={p.id} className="sr-row">
                    <Link className="stretch" href={`/people/${p.id}`} aria-label={`Open ${p.name}'s profile`} />
                    <Avatar name={p.name} src={p.photoUrl} size={40} />
                    <span style={{ minWidth: 0 }}>
                      <b>
                        <Highlight text={p.name} q={r.q} />
                      </b>
                      <small>
                        {p.matchedSkill ? (
                          <>
                            Skill: <Highlight text={p.matchedSkill} q={r.q} />
                          </>
                        ) : (
                          <Highlight text={[p.title, p.department].filter(Boolean).join(" · ")} q={r.q} />
                        )}
                      </small>
                    </span>
                    <span className="chips">
                      {p.groups.map((g) => (
                        <span key={g} className="chip sm">
                          {g}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(r.groups.length > 0 || r.skills.length > 0) && (
            <div className="s5" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {r.groups.length > 0 && (
                <section className="card glass sr-sec">
                  <h2 className="c-title">
                    <span className="ic" style={{ ["--c" as string]: "var(--coral)" }}>
                      <Icon name="layers" />
                    </span>
                    Groups · {r.groups.length}
                  </h2>
                  <ul className="sr-list">
                    {r.groups.map((g) => (
                      <li key={g.slug} className="sr-row">
                        <Link className="stretch" href={`/groups/${g.slug}`} aria-label={`Open ${g.name}`} />
                        <span className="g-badge" style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color], width: 40, height: 40, borderRadius: 12, fontSize: 12 }}>
                          {g.shortCode}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <b>
                            <Highlight text={g.name} q={r.q} />
                          </b>
                          <small>{g.open ? "Your group" : "Members only"}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {r.skills.length > 0 && (
                <section className="card glass sr-sec">
                  <h2 className="c-title">
                    <span className="ic" style={{ ["--c" as string]: "var(--lagoon)" }}>
                      <Icon name="spark" />
                    </span>
                    Skills · {r.skills.length}
                  </h2>
                  <ul className="sr-list">
                    {r.skills.map((s) => (
                      <li key={s.skill} className="sr-row" style={{ flexWrap: "wrap" }}>
                        <span style={{ minWidth: 0 }}>
                          <b>
                            <Highlight text={s.skill} q={r.q} />
                          </b>
                          <small>
                            {s.people
                              .slice(0, 4)
                              .map((p) => p.name)
                              .join(", ")}
                            {s.people.length > 4 ? ` and ${s.people.length - 4} more` : ""}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {r.papers.length > 0 && (
            <section className="card glass s12 sr-sec">
              <h2 className="c-title">
                <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
                  <Icon name="book" />
                </span>
                Papers · {r.papers.length}
              </h2>
              <ul className="sr-list">
                {r.papers.map((p) => (
                  <li key={p.id} className="sr-row">
                    {p.authorId && <Link className="stretch" href={`/people/${p.authorId}`} aria-label={`Open ${p.authorName}'s profile`} />}
                    <span className="mono" style={{ width: 44, flex: "none", color: "var(--ink-3)" }}>
                      {p.year}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <b>
                        <Highlight text={p.title} q={r.q} />
                      </b>
                      <small>
                        <Highlight text={p.venue} q={r.q} />
                        {p.authorName ? ` · ${p.authorName}` : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
