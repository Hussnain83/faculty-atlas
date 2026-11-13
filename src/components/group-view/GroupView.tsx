"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { GroupNetwork } from "@/components/group-view/GroupNetwork";
import type { GroupData, GroupMember } from "@/components/group-view/types";
import { ComboChart, Gauge, Spark } from "@/components/profile-view/charts";
import { HeroField } from "@/components/profile-view/HeroField";
import { fmt, PubCard, useReveal, useTilt } from "@/components/profile-view/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { hIndex, yearSeries } from "@/lib/stats";
import { GROUP_COLOR_VAR, STATUS_LABEL } from "@/lib/ui";

type Sort = "pubs" | "name" | "complete";
const lastName = (n: string) => n.trim().split(/\s+/).slice(-1)[0] ?? n;

/** Mouse parallax for the hero's floating objects. */
function useParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, [ref]);
}

export function GroupView({ data, memberActions = {}, headerActions, children }: { data: GroupData; memberActions?: Record<string, ReactNode>; headerActions?: ReactNode; children?: ReactNode }) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [sort, setSort] = useState<Sort>("pubs");
  const [showcase, setShowcase] = useState<"latest" | "cited">("latest");
  useReveal(rootRef);
  useTilt(rootRef);
  useParallax(heroRef);

  const c = GROUP_COLOR_VAR[data.color] ?? "var(--lagoon)";
  const c2 = data.color === "iris" ? "var(--lagoon)" : "var(--iris)";
  const { members, publications: pubs } = data;
  const lead = members.find((m) => m.isLead);

  // Per-member numbers come from the group's paper list (every paper by a member is in it).
  const stats = useMemo(() => {
    const per = new Map<string, number[]>();
    members.forEach((m) => per.set(m.id, []));
    pubs.forEach((p) => p.memberIds.forEach((id) => per.get(id)?.push(p.citations)));
    const out: Record<string, { papers: number; cites: number; h: number }> = {};
    per.forEach((cs, id) => (out[id] = { papers: cs.length, cites: cs.reduce((s, v) => s + v, 0), h: hIndex(cs) }));
    return out;
  }, [members, pubs]);
  const papersOf = useMemo(() => Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, s.papers])), [stats]);

  const edges = useMemo(() => {
    const w = new Map<string, number>();
    pubs.forEach((p) => {
      const a = [...new Set(p.memberIds)];
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        const key = [a[i], a[j]].sort().join("|");
        w.set(key, (w.get(key) ?? 0) + 1);
      }
    });
    return [...w.entries()].map(([key, n]) => {
      const [a, b] = key.split("|");
      return { a, b, w: n };
    });
  }, [pubs]);

  const cites = pubs.reduce((s, p) => s + p.citations, 0);
  const raw = Object.values(stats).reduce((s, v) => s + v.papers, 0);
  const shared = raw - pubs.length;
  const from = data.thisYear - 9;
  const years = yearSeries(pubs, from, data.thisYear);
  const citeYears = yearSeries(pubs, from, data.thisYear, (rows) => rows.reduce((s, r) => s + r.citations, 0));
  const maxPairs = Math.max(1, (members.length * (members.length - 1)) / 2);
  const avg = members.length ? (pubs.length / members.length).toFixed(1) : "0";
  const maxCites = pubs.length ? Math.max(...pubs.map((p) => p.citations)) : 0;
  const showList = showcase === "cited" ? [...pubs].sort((a, b) => b.citations - a.citations) : pubs;

  const skills = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((m) => new Set(m.skills).forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 7);
  }, [members]);

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) =>
        sort === "name"
          ? lastName(a.name).localeCompare(lastName(b.name))
          : sort === "complete"
            ? b.completeness - a.completeness
            : (stats[b.id]?.papers ?? 0) - (stats[a.id]?.papers ?? 0) || a.name.localeCompare(b.name),
      ),
    [members, sort, stats],
  );

  const tokens = useMemo(
    () => [...years.filter((y) => y.v).map((y) => y.l), `${pubs.length} papers`, `${fmt(cites)} cites`, `n=${members.length}`, "Σ", "∂", "λ", "π", "μ"],
    [years, pubs.length, cites, members.length],
  );

  let k = 0;
  const nameLetters = data.name.split(" ").map((w, wi) => (
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
      <Link className="back enter" href="/groups">
        <Icon name="back" />
        All groups
      </Link>

      {/* ---------- hero with the collaboration map ---------- */}
      <section className="phero ghero" ref={heroRef} style={{ ["--c1" as string]: c, ["--c2" as string]: c2 }}>
        <HeroField tokens={tokens} />
        <div className="ph-objs" aria-hidden="true">
          <div className="obj" style={{ left: "3%", top: "7%", ["--dx" as string]: "30px", ["--dy" as string]: "24px" }}>
            <span className="orb" style={{ ["--sz" as string]: "26px", ["--c" as string]: "var(--c2)" }} />
          </div>
          <div className="obj" style={{ left: "38%", bottom: "5%", ["--dx" as string]: "-40px", ["--dy" as string]: "-26px" }}>
            <div className="obj-p">
              <div className="gyro" style={{ width: 96, height: 96 }}>
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="obj" style={{ right: "4%", top: "6%", ["--dx" as string]: "-30px", ["--dy" as string]: "30px" }}>
            <span className="orb" style={{ ["--sz" as string]: "44px", ["--c" as string]: "var(--c1)", animationDelay: "-2s" }} />
          </div>
        </div>
        <div className="ph-grid gh-grid">
          <div className="ph-info">
            <div className="gh-badge enter" style={{ ["--d" as string]: ".1s" }}>
              <span className="g-badge" style={{ ["--c" as string]: c }}>
                {data.shortCode}
              </span>
              <span className="eyebrow">
                Research group{data.foundedYear ? ` · since ${data.foundedYear}` : ""}
                {data.archived ? " · archived" : ""}
              </span>
            </div>
            <h1 className="ph-name gh-name" aria-label={data.name}>
              <span aria-hidden="true">{nameLetters}</span>
            </h1>
            <p className={`ph-bio enter${data.description ? "" : " muted"}`} style={{ ["--d" as string]: ".6s" }}>
              {data.description || "No description yet."}
            </p>
            {lead && (
              <Link className="gh-lead enter" style={{ ["--d" as string]: ".75s" }} href={`/people/${lead.id}`}>
                <Avatar name={lead.name} src={lead.photoUrl} size={40} />
                <span>
                  <small>Group lead</small>
                  <b>{lead.name}</b>
                </span>
              </Link>
            )}
            <div className="ph-facts enter" style={{ ["--d" as string]: ".9s" }}>
              <span>
                <b>{members.length}</b> {members.length === 1 ? "member" : "members"}
              </span>
              <span>
                <b>{pubs.length}</b> publications
              </span>
              <span>
                <b>{edges.length}</b> co-author links
              </span>
            </div>
            {headerActions && (
              <div className="p-actions enter" style={{ ["--d" as string]: "1.05s", justifyContent: "flex-start" }}>
                {headerActions}
              </div>
            )}
          </div>
          <GroupNetwork members={members} edges={edges} color={data.color} shortCode={data.shortCode} papersOf={papersOf} />
        </div>
      </section>

      {/* ---------- numbers ---------- */}
      <section className="bento">
        <div className="s3 rv" data-d="0">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: c }}>
            <div className="st-top">
              <span className="k-label">Members</span>
              <Gauge pct={data.directorySize ? (members.length / data.directorySize) * 100 : Math.min(100, members.length * 10)} color={c} />
            </div>
            <b data-count={members.length}>{members.length}</b>
            <small>{avg} papers per member</small>
          </div>
        </div>
        <div className="s3 rv" data-d="90">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--iris)" }}>
            <div className="st-top">
              <span className="k-label">Publications</span>
              <Spark id={`${uid}s1`} values={years.map((y) => y.v)} color="var(--iris)" />
            </div>
            <b data-count={pubs.length}>{fmt(pubs.length)}</b>
            <small>{shared > 0 ? `${shared} co-authored ${shared === 1 ? "paper" : "papers"} counted once` : "No duplicates across members"}</small>
          </div>
        </div>
        <div className="s3 rv" data-d="180">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--saffron)" }}>
            <div className="st-top">
              <span className="k-label">Citations</span>
              <Spark id={`${uid}s2`} values={citeYears.map((y) => y.v)} color="var(--saffron)" />
            </div>
            <b data-count={cites}>{fmt(cites)}</b>
            <small>Across all group papers</small>
          </div>
        </div>
        <div className="s3 rv" data-d="270">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--mint)" }}>
            <div className="st-top">
              <span className="k-label">Co-author links</span>
              <Gauge pct={(edges.length / maxPairs) * 100} color="var(--mint)" />
            </div>
            <b data-count={edges.length}>{edges.length}</b>
            <small>Member pairs who published together</small>
          </div>
        </div>

        <div className="card glass s12 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
                <Icon name="book" />
              </span>
              Publication showcase
            </h3>
            <div className="tabs" role="tablist">
              {(
                [
                  ["latest", "Latest"],
                  ["cited", "Most cited"],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={showcase === key} className={showcase === key ? "on" : ""} onClick={() => setShowcase(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {showList.length ? (
            <>
              <div className="pc-grid" key={showcase}>
                {showList.slice(0, 6).map((p, i) => (
                  <PubCard key={p.id} p={p} i={i} max={maxCites} />
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Showing {Math.min(6, showList.length)} of {showList.length} papers. Papers written by several members appear once.
              </p>
            </>
          ) : (
            <div className="empty">No publications yet.</div>
          )}
        </div>

        <div className="card glass s7 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: c }}>
                <Icon name="chart" />
              </span>
              Research momentum
            </h3>
            <div className="legend">
              <span>
                <i style={{ ["--c" as string]: c }} />
                Papers per year
              </span>
              <span>
                <i className="line" style={{ ["--c" as string]: "var(--coral)" }} />
                Running total
              </span>
            </div>
          </div>
          {pubs.length ? <ComboChart id={`${uid}cc`} years={years} cBar={c} cLine="var(--coral)" /> : <div className="empty">No publications yet.</div>}
        </div>

        <div className="card glass s5 rv" data-d="120">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
                <Icon name="spark" />
              </span>
              Strongest skills
            </h3>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Members listing each skill
            </span>
          </div>
          {skills.length ? (
            <div className="hbars">
              {skills.map(([skill, n]) => (
                <div className="hbar" key={skill} style={{ ["--c" as string]: c }}>
                  <span title={skill}>{skill}</span>
                  <div className="track">
                    <i style={{ width: `${((n / Math.max(1, members.length)) * 100).toFixed(1)}%` }} />
                  </div>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No skills listed yet.</div>
          )}
        </div>
      </section>

      {/* ---------- members ---------- */}
      <section className="rv" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="c-head">
          <h2 style={{ fontSize: 20 }}>Members</h2>
          <div className="toolbar" style={{ padding: 0 }}>
            <label className="muted" htmlFor="member-sort" style={{ fontSize: 13 }}>
              Sort by
            </label>
            <select className="input select" id="member-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="pubs">Most publications</option>
              <option value="name">Last name</option>
              <option value="complete">Profile completeness</option>
            </select>
          </div>
        </div>
        {sorted.length ? (
          <div className="m-grid">
            {sorted.map((m, i) => (
              <MemberCard key={m.id} m={m} i={i} s={stats[m.id]} actions={memberActions[m.id]} />
            ))}
          </div>
        ) : (
          <div className="empty glass">No members yet.{data.isAdmin ? " Add people from the directory below." : ""}</div>
        )}
      </section>

      {children}
    </section>
  );
}

function MemberCard({ m, i, s, actions }: { m: GroupMember; i: number; s?: { papers: number; cites: number; h: number }; actions?: ReactNode }) {
  const meter = m.completeness < 60 ? "var(--coral)" : m.completeness < 80 ? "var(--saffron)" : "var(--lagoon)";
  return (
    <article className="m-card glass" style={{ ["--i" as string]: i }}>
      <Link className="stretch" href={`/people/${m.id}`} aria-label={`Open ${m.name}'s profile`} />
      {m.isLead && (
        <span className="chip lead" style={{ ["--c" as string]: "var(--saffron)" }}>
          <Icon name="star" width={12} height={12} />
          Lead
        </span>
      )}
      {m.status !== "active" && (
        <span className="chip sm m-status" style={{ ["--c" as string]: STATUS_LABEL[m.status].color }}>
          {STATUS_LABEL[m.status].label}
        </span>
      )}
      <div className="who">
        <Avatar name={m.name} src={m.photoUrl} size={50} />
        <div style={{ minWidth: 0 }}>
          <h4>{m.name}</h4>
          <p className="t">{[m.title, m.department].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="nums">
        <div>
          <b>{s?.papers ?? 0}</b>
          <span>papers</span>
        </div>
        <div>
          <b>{fmt(s?.cites ?? 0)}</b>
          <span>citations</span>
        </div>
        <div>
          <b>{s?.h ?? 0}</b>
          <span>h-index</span>
        </div>
      </div>
      {m.skills.length > 0 && (
        <div className="mini">
          {m.skills.slice(0, 3).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="comp" title="Profile completeness">
        <div className="meter" style={{ ["--c" as string]: meter }}>
          <i style={{ width: `${m.completeness}%` }} />
        </div>
        <span>{m.completeness}%</span>
      </div>
      {actions && <div className="row-actions">{actions}</div>}
    </article>
  );
}
