"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { OverviewData, OvPerson } from "@/components/overview/types";
import { ComboChart, Gauge, Spark } from "@/components/profile-view/charts";
import { HeroField } from "@/components/profile-view/HeroField";
import { fmt, shortName, useReveal, useTilt } from "@/components/profile-view/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GROUP_COLOR_VAR } from "@/lib/ui";

const ACT_KIND: Record<OverviewData["activity"][number]["kind"], { icon: IconName; c: string; label: string }> = {
  publication: { icon: "book", c: "var(--iris)", label: "Papers" },
  cv: { icon: "file", c: "var(--saffron)", label: "CVs" },
  person: { icon: "user", c: "var(--lagoon)", label: "People" },
  award: { icon: "award", c: "var(--coral)", label: "Awards" },
  group: { icon: "layers", c: "var(--mint)", label: "Groups" },
};
type Board = "cites" | "papers" | "h";

/** The groups orbit the faculty like planets; pointing at the galaxy pauses it. */
function useGalaxy(ref: React.RefObject<HTMLDivElement | null>, heroRef: React.RefObject<HTMLElement | null>, count: number) {
  useEffect(() => {
    const gx = ref.current, hero = heroRef.current;
    if (!gx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pls = [...gx.querySelectorAll<HTMLElement>(".planet")];
    let a0 = -0.4, paused = false, raf = 0;
    const pause = () => (paused = true), resume = () => (paused = false);
    const onMove = (e: PointerEvent) => {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    const frame = () => {
      if (!paused && !still) a0 += 0.0032;
      const w = gx.clientWidth, h = gx.clientHeight, rx = Math.min(w * (w < 600 ? 0.27 : 0.36), 250), ry = h * 0.27;
      pls.forEach((p, i) => {
        const a = a0 + (i / pls.length) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry, z = (Math.sin(a) + 1) / 2;
        p.style.transform = `translate(${(x - 31).toFixed(1)}px,${(y - 31).toFixed(1)}px) scale(${(0.72 + 0.4 * z).toFixed(3)})`;
        p.style.zIndex = y > 0 ? "10" : "2";
        p.style.opacity = (0.6 + 0.4 * z).toFixed(2);
      });
      if (!still) raf = requestAnimationFrame(frame);
    };
    gx.addEventListener("pointerenter", pause);
    gx.addEventListener("pointerleave", resume);
    gx.addEventListener("focusin", pause);
    gx.addEventListener("focusout", resume);
    hero?.addEventListener("pointermove", onMove, { passive: true });
    frame();
    return () => {
      cancelAnimationFrame(raf);
      gx.removeEventListener("pointerenter", pause);
      gx.removeEventListener("pointerleave", resume);
      gx.removeEventListener("focusin", pause);
      gx.removeEventListener("focusout", resume);
      hero?.removeEventListener("pointermove", onMove);
    };
  }, [ref, heroRef, count]);
}

function Ring({ pct, c }: { pct: number; c: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="5" />
      <circle className="arc" cx="32" cy="32" r="28" fill="none" style={{ stroke: c, strokeDasharray: `${Math.max(1, pct)} 100` }} strokeWidth="5" strokeLinecap="round" pathLength={100} transform="rotate(-90 32 32)" />
    </svg>
  );
}

export function OverviewView({ data }: { data: OverviewData }) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const galaxyRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<Board>("cites");
  const [actF, setActF] = useState<"all" | OverviewData["activity"][number]["kind"]>("all");
  useReveal(rootRef);
  useTilt(rootRef);
  useGalaxy(galaxyRef, heroRef, data.groups.length);

  const { isAdmin, people, groups, totals, me } = data;
  const myGroups = groups.filter((g) => g.open);
  const colleagues = isAdmin ? people.length : Math.max(0, people.length - 1);
  const complete = people.filter((p) => p.completeness >= 80).length;
  const ranked = useMemo(() => {
    const val = (p: OvPerson) => (board === "papers" ? p.papers : board === "h" ? p.h : p.cites);
    return people.map((p) => ({ p, v: val(p) })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v || a.p.name.localeCompare(b.p.name));
  }, [people, board]);
  const low = people.filter((p) => p.completeness < 80).sort((a, b) => a.completeness - b.completeness).slice(0, 6);
  const acts = data.activity.filter((a) => actF === "all" || a.kind === actF).slice(0, 7);
  const tokens = useMemo(
    () => [String(data.thisYear), String(data.thisYear - 1), `${totals.papers} papers`, `${people.length} people`, ...groups.map((g) => g.shortCode), "Σ", "π", "λ", "∫", "n=" + people.length],
    [data.thisYear, totals.papers, people.length, groups],
  );

  let k = 0;
  const greet = `Good to see you, ${data.greeting}`.split(" ").map((w, wi) => (
    <span key={wi}>
      {wi > 0 && " "}
      <span className="w">
        {[...w].map((ch) => (
          <span className="ch" key={k} style={{ ["--i" as string]: k++ }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  ));

  return (
    <section className="view" ref={rootRef}>
      {/* ---------- hero: orbiting groups ---------- */}
      <section className="phero ghero" ref={heroRef} style={{ ["--c1" as string]: "var(--lagoon)", ["--c2" as string]: "var(--iris)" }}>
        <HeroField tokens={tokens} />
        <div className="ph-objs" aria-hidden="true">
          <div className="obj" style={{ left: "2%", bottom: "6%", ["--dx" as string]: "30px", ["--dy" as string]: "24px" }}>
            <div className="obj-p">
              <div className="cube">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="obj" style={{ left: "44%", top: "8%", ["--dx" as string]: "-26px", ["--dy" as string]: "20px" }}>
            <span className="orb" style={{ ["--sz" as string]: "24px", ["--c" as string]: "var(--coral)" }} />
          </div>
          <div className="obj" style={{ right: "3%", bottom: "10%", ["--dx" as string]: "-34px", ["--dy" as string]: "-26px" }}>
            <span className="orb" style={{ ["--sz" as string]: "40px", ["--c" as string]: "var(--saffron)", animationDelay: "-4s" }} />
          </div>
        </div>
        <div className="ph-grid ov-grid">
          <div className="ph-info">
            <p className="eyebrow enter" style={{ ["--d" as string]: ".05s" }}>
              {data.today}
            </p>
            <h1 className="ph-name ov-name" aria-label={`Good to see you, ${data.greeting}`}>
              <span aria-hidden="true">{greet}</span>
            </h1>
            <p className="ph-bio enter" style={{ ["--d" as string]: ".6s" }}>
              {isAdmin
                ? `${people.length} researchers across ${groups.length} groups. Here is what is happening in the faculty.`
                : myGroups.length
                  ? `${people.length} people across your ${myGroups.length} ${myGroups.length === 1 ? "group" : "groups"}. Here is what is happening.`
                  : "You are not in a research group yet. The research office adds people to groups, and you will see your colleagues here once they do."}
            </p>
            <div className="ov-pulse enter" style={{ ["--d" as string]: ".8s" }}>
              {isAdmin ? (
                <>
                  <Link href="/people">
                    <b>+{totals.papersThisYear}</b>
                    <span>papers in {data.thisYear}</span>
                  </Link>
                  <Link href="/people">
                    <b>{people.length - totals.cvs}</b>
                    <span>CVs missing</span>
                  </Link>
                  <Link href="/people">
                    <b>{people.length - totals.inGroups}</b>
                    <span>not in a group</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/profile/edit">
                    <b>{me?.completeness ?? 0}%</b>
                    <span>your profile</span>
                  </Link>
                  <Link href="/groups">
                    <b>{myGroups.length}</b>
                    <span>{myGroups.length === 1 ? "group joined" : "groups joined"}</span>
                  </Link>
                  <Link href="/people">
                    <b>+{totals.papersThisYear}</b>
                    <span>papers in {data.thisYear}</span>
                  </Link>
                </>
              )}
            </div>
            <div className="p-actions enter" style={{ ["--d" as string]: ".95s", justifyContent: "flex-start" }}>
              {isAdmin ? (
                <>
                  <Link className="btn btn-primary" href="/groups/new">
                    <Icon name="plus" />
                    New group
                  </Link>
                  <Link className="btn btn-ghost" href="/people/import">
                    <Icon name="upload" />
                    Import people
                  </Link>
                </>
              ) : (
                me && (
                  <Link className="btn btn-primary" href={`/people/${me.id}`}>
                    <Icon name="user" />
                    Open my profile
                  </Link>
                )
              )}
              <Link className="btn btn-ghost" href="/groups">
                <Icon name="layers" />
                Browse groups
              </Link>
            </div>
          </div>
          <div className="galaxy" ref={galaxyRef}>
            <span className="gx-ring r1" aria-hidden="true" />
            <span className="gx-ring r2" aria-hidden="true" />
            <div className="gx-core" aria-hidden="true">
              <b>Northfield</b>
              <small>{people.length} researchers</small>
            </div>
            {groups.map((g, i) => (
              <Link key={g.id} className={`planet${g.open ? "" : " locked"}`} href={`/groups/${g.slug}`} style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color], ["--i" as string]: i }}>
                <span className="pl-orb">
                  {g.shortCode}
                  {g.open ? (
                    <span className="pl-moons" aria-hidden="true">
                      {g.faces.slice(0, 3).map((f, j) => (
                        <span className="moon" key={j} style={{ ["--a" as string]: `${j * 120}deg` }}>
                          <Avatar name={f.name} src={f.photoUrl} size={22} />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="pl-lock" aria-hidden="true">
                      <Icon name="lock" />
                    </span>
                  )}
                </span>
                <span className="pl-label">
                  <b>{g.name}</b>
                  <small>{g.open ? `${g.members} members · ${g.papers} papers` : "Members only"}</small>
                </span>
              </Link>
            ))}
            <p className="gx-hint">Point at a group to pause it. Click to open it.</p>
          </div>
        </div>
      </section>

      {/* ---------- numbers ---------- */}
      <section className="bento">
        <div className="s3 rv" data-d="0">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--lagoon)" }}>
            <div className="st-top">
              <span className="k-label">{isAdmin ? "People in directory" : "People in your groups"}</span>
              <Gauge pct={isAdmin ? (totals.inGroups / Math.max(1, people.length)) * 100 : (complete / Math.max(1, people.length)) * 100} color="var(--lagoon)" />
            </div>
            <b data-count={colleagues}>{colleagues}</b>
            <small>{isAdmin ? `${totals.inGroups} placed in a group` : `${complete} with a complete profile`}</small>
          </div>
        </div>
        <div className="s3 rv" data-d="90">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--coral)" }}>
            <div className="st-top">
              <span className="k-label">{isAdmin ? "Research groups" : "Your groups"}</span>
              <span className="gdots" aria-hidden="true">
                {(isAdmin ? groups : myGroups).map((g) => (
                  <i key={g.id} style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }} />
                ))}
              </span>
            </div>
            <b data-count={isAdmin ? groups.length : myGroups.length}>{isAdmin ? groups.length : myGroups.length}</b>
            <small>{isAdmin ? `${totals.memberships} memberships in total` : `${groups.length - myGroups.length} other groups are members-only`}</small>
          </div>
        </div>
        <div className="s3 rv" data-d="180">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--iris)" }}>
            <div className="st-top">
              <span className="k-label">Publications</span>
              <Spark id={`${uid}s1`} values={data.years.map((y) => y.v)} color="var(--iris)" />
            </div>
            <b data-count={totals.papers}>{fmt(totals.papers)}</b>
            <small>
              {totals.papersThisYear} published in {data.thisYear}
            </small>
          </div>
        </div>
        <div className="s3 rv" data-d="270">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--saffron)" }}>
            <div className="st-top">
              <span className="k-label">CVs uploaded</span>
              <Gauge pct={(totals.cvs / Math.max(1, people.length)) * 100} color="var(--saffron)" />
            </div>
            <b data-count={totals.cvs}>{totals.cvs}</b>
            <small>
              {people.length - totals.cvs} {people.length - totals.cvs === 1 ? "profile is" : "profiles are"} still missing a CV
            </small>
          </div>
        </div>

        <div className="card glass s8 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic">
                <Icon name="chart" />
              </span>
              {isAdmin ? "Faculty research momentum" : "Research momentum in your groups"}
            </h3>
            <div className="legend">
              <span>
                <i style={{ ["--c" as string]: "var(--lagoon)" }} />
                Papers per year
              </span>
              <span>
                <i className="line" style={{ ["--c" as string]: "var(--coral)" }} />
                Running total
              </span>
            </div>
          </div>
          {totals.papers ? <ComboChart id={`${uid}cc`} years={data.years} cBar="var(--lagoon)" cLine="var(--coral)" /> : <div className="empty">No publications yet.</div>}
        </div>

        <div className="card glass s4 rv" data-d="140">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--saffron)" }}>
                <Icon name="star" />
              </span>
              Top researchers
            </h3>
          </div>
          <div className="tabs" role="tablist">
            {(
              [
                ["cites", "Citations"],
                ["papers", "Papers"],
                ["h", "h-index"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={board === key} className={board === key ? "on" : ""} onClick={() => setBoard(key)}>
                {label}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: -6 }}>
              Ranked within your groups
            </p>
          )}
          {ranked.length >= 3 && (
            <div className="podium" key={board}>
              {[1, 0, 2].map((idx) => {
                const r = ranked[idx];
                return (
                  <Link key={r.p.id} className={`pod p${idx + 1}`} href={`/people/${r.p.id}`} style={{ ["--i" as string]: idx }}>
                    <span className="pod-av">
                      <Avatar name={r.p.name} src={r.p.photoUrl} size={idx === 0 ? 62 : 50} />
                      <em>{idx + 1}</em>
                    </span>
                    <b>{shortName(r.p.name)}</b>
                    <span className="pod-v">{fmt(r.v)}</span>
                    <span className="pod-block">{idx + 1}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {ranked.length === 0 ? (
            <div className="empty">No publications yet.</div>
          ) : (
            <ol className="lb-rest">
              {ranked.slice(ranked.length < 3 ? 0 : 3, 6).map((r, i) => (
                <li key={r.p.id}>
                  <span className="mono">{i + (ranked.length < 3 ? 1 : 4)}</span>
                  <Avatar name={r.p.name} src={r.p.photoUrl} size={28} />
                  <Link href={`/people/${r.p.id}`}>{r.p.name}</Link>
                  <b>{fmt(r.v)}</b>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card glass s7 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--coral)" }}>
                <Icon name="layers" />
              </span>
              Research groups
            </h3>
            <Link className="back" href="/groups">
              See all <Icon name="arrow" />
            </Link>
          </div>
          {groups.length === 0 ? (
            <div className="empty">No groups yet.</div>
          ) : (
            <div className="g-grid">
              {[...groups]
                .sort((a, b) => Number(b.open) - Number(a.open))
                .map((g) => (
                  <article key={g.id} className={`g-card glass${g.open ? "" : " g-locked"}`} style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }}>
                    <Link className="stretch" href={`/groups/${g.slug}`} aria-label={`Open ${g.name}`} />
                    <div className="g-top">
                      <span className="g-badge">{g.shortCode}</span>
                      <div style={{ minWidth: 0 }}>
                        <h3>{g.name}</h3>
                        <p className="desc">{g.description || "No description yet."}</p>
                      </div>
                    </div>
                    {g.open ? (
                      <div className="g-stats">
                        <div>
                          <b>{g.members}</b>
                          <span>members</span>
                        </div>
                        <div>
                          <b>{g.papers}</b>
                          <span>papers</span>
                        </div>
                      </div>
                    ) : (
                      <div className="g-lockrow">
                        <Icon name="lock" />
                        <span>Members only.</span>
                      </div>
                    )}
                  </article>
                ))}
            </div>
          )}
        </div>

        <div className="card glass s5 rv" data-d="140">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
                <Icon name="spark" />
              </span>
              Recent activity
            </h3>
            <span className="chip" style={{ ["--c" as string]: "var(--mint)" }}>
              <span className="pulse" />
              Live
            </span>
          </div>
          <div className="filters act-f" role="group" aria-label="Filter activity">
            <button type="button" className={actF === "all" ? "on" : ""} aria-pressed={actF === "all"} onClick={() => setActF("all")}>
              All
            </button>
            {(Object.keys(ACT_KIND) as (keyof typeof ACT_KIND)[]).map((key) => (
              <button key={key} type="button" className={actF === key ? "on" : ""} aria-pressed={actF === key} onClick={() => setActF(key)}>
                <Icon name={ACT_KIND[key].icon} width={13} height={13} />
                {ACT_KIND[key].label}
              </button>
            ))}
          </div>
          {acts.length ? (
            <ol className="act">
              {acts.map((a, i) => (
                <li key={a.id} style={{ ["--i" as string]: i }}>
                  <span className="act-ic" style={{ ["--c" as string]: ACT_KIND[a.kind].c }}>
                    <Icon name={ACT_KIND[a.kind].icon} />
                  </span>
                  <div className="act-body">
                    <p className="act-who">
                      {a.who ? (
                        <Link href={`/people/${a.who.id}`}>
                          <Avatar name={a.who.name} src={a.who.photoUrl} size={22} />
                          {a.who.name}
                        </Link>
                      ) : (
                        <b>Someone</b>
                      )}
                      <span>{a.summary}</span>
                    </p>
                    {a.subject && <p className="act-obj">{a.subject}</p>}
                    <time>{a.when}</time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty act-empty">{data.activity.length ? "Nothing in this category yet." : "No activity yet. New papers, CVs and group changes show up here."}</div>
          )}
        </div>

        {!isAdmin && me && (
          <div className="card glass s12 rv" data-d="0">
            <div className="c-head">
              <h3 className="c-title">
                <span className="ic" style={{ ["--c" as string]: "var(--saffron)" }}>
                  <Icon name="user" />
                </span>
                Your profile
              </h3>
              <Link className="back" href={`/people/${me.id}`}>
                Open my profile <Icon name="arrow" />
              </Link>
            </div>
            <div className="att-grid">
              <article className="att glass tilt" style={{ ["--c" as string]: me.completeness < 80 ? "var(--saffron)" : "var(--mint)", ["--i" as string]: 0 }}>
                <Link className="stretch" href="/profile/edit" aria-label="Edit my profile" />
                <div className="att-ring">
                  <Ring pct={me.completeness} c={me.completeness < 80 ? "var(--saffron)" : "var(--mint)"} />
                  <Avatar name={me.name} src={me.photoUrl} size={48} />
                </div>
                <div className="att-main">
                  <b>{me.name}</b>
                  <small>{me.title}</small>
                </div>
                <span className="att-pct">{me.completeness}%</span>
                <p className="att-miss">
                  <Icon name="info" />
                  {me.missing[0] ? `${me.missing[0].label} adds ${me.missing[0].points}%` : "Your profile is complete"}
                </p>
              </article>
              {me.missing.slice(1, 4).map((m, i) => (
                <article key={m.label} className="att glass" style={{ ["--c" as string]: "var(--iris)", ["--i" as string]: i + 1, gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <Link className="stretch" href="/profile/edit" aria-label={m.label} />
                  <div className="att-main">
                    <b>{m.label}</b>
                    <small>Next step for your profile</small>
                  </div>
                  <span className="att-pct">+{m.points}%</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {isAdmin && low.length > 0 && (
          <div className="card glass s12 rv" data-d="0">
            <div className="c-head">
              <h3 className="c-title">
                <span className="ic" style={{ ["--c" as string]: "var(--saffron)" }}>
                  <Icon name="user" />
                </span>
                Profiles that need attention
              </h3>
              <span className="muted" style={{ fontSize: 13 }}>
                Below 80% complete · the next step is shown on each card
              </span>
            </div>
            <div className="att-grid">
              {low.map((p, i) => {
                const col = p.completeness < 60 ? "var(--coral)" : "var(--saffron)";
                return (
                  <article key={p.id} className="att glass tilt" style={{ ["--c" as string]: col, ["--i" as string]: i }}>
                    <Link className="stretch" href={`/people/${p.id}`} aria-label={`Open ${p.name}'s profile`} />
                    <div className="att-ring">
                      <Ring pct={p.completeness} c={col} />
                      <Avatar name={p.name} src={p.photoUrl} size={48} />
                    </div>
                    <div className="att-main">
                      <b>{p.name}</b>
                      <small>{p.title}</small>
                    </div>
                    <span className="att-pct">{p.completeness}%</span>
                    <p className="att-miss">
                      <Icon name="info" />
                      {p.nextStep ?? "Review the profile"}
                    </p>
                    <Link className="btn btn-sm att-btn" href={`/profile/edit?person=${p.id}`}>
                      <Icon name="edit" />
                      Edit profile
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
