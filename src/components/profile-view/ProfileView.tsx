"use client";

/* eslint-disable @next/next/no-img-element -- signed storage URLs expire hourly; next/image would cache stale ones */

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ComboChart, Donut, Gauge, Spark } from "@/components/profile-view/charts";
import { HeroField } from "@/components/profile-view/HeroField";
import type { ProfileData, ProfilePublication } from "@/components/profile-view/types";
import { Avatar, colorsFor, initialsOf } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/image";
import { hIndex, topCounts, yearSeries } from "@/lib/stats";
import { GROUP_COLOR_VAR } from "@/lib/ui";

const CAT_COLOR = { research: "var(--lagoon)", tools: "var(--iris)", teaching: "var(--coral)" } as const;
const CAT_LABEL = { research: "Research", tools: "Tools", teaching: "Teaching" } as const;
const ACH = {
  award: { icon: "award" as IconName, c: "var(--saffron)", label: "Award", back: (o: string, y: number) => `Recognised by ${o || "the awarding body"} in ${y}.` },
  grant: { icon: "star" as IconName, c: "var(--mint)", label: "Grant", back: (o: string, y: number) => `Funding from ${o || "the funder"}, awarded in ${y}.` },
  certificate: { icon: "shield" as IconName, c: "var(--iris)", label: "Certificate", back: (_o: string, y: number) => `Earned in ${y}.` },
};
const fmt = (n: number) => n.toLocaleString("en-US");
const shortName = (n: string) => n.replace(/^(Dr\.|Prof\.)\s+/, "");

/* ---------------------------------------------------------------- effects */

/** Tilting ID card, orbiting chips and parallax objects in the hero. */
function useHero(heroRef: React.RefObject<HTMLElement | null>, cardRef: React.RefObject<HTMLDivElement | null>, stageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const hero = heroRef.current, card = cardRef.current, stage = stageRef.current;
    if (!hero || !card || !stage) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chips = [...stage.querySelectorAll<HTMLElement>(".oc")];
    let tx = 0, ty = 0, cx = 0, cy = 0, a0 = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
    };
    const frame = (t: number) => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      const idle = still ? 0 : Math.sin(t * 0.0005) * 7;
      card.style.transform = `rotateY(${(cx * 32 + idle).toFixed(2)}deg) rotateX(${(-cy * 24).toFixed(2)}deg)`;
      card.style.setProperty("--gx", `${(50 + cx * 160).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(50 + cy * 160).toFixed(1)}%`);
      card.style.setProperty("--sx", `${(40 + cx * 70 + idle * 3).toFixed(1)}%`);
      hero.style.setProperty("--mx", cx.toFixed(3));
      hero.style.setProperty("--my", cy.toFixed(3));
      const w = stage.clientWidth, rx = Math.max(90, Math.min(240, w / 2 - 30)), n = chips.length;
      if (!still) a0 += 0.0042;
      chips.forEach((c, i) => {
        const a = a0 + (i / n) * Math.PI * 2, z = Math.sin(a), d = (z + 1) / 2;
        const x = Math.cos(a) * rx + cx * 40 * z, y = ((i % 3) - 1) * 118 + Math.sin(a + 1) * 26 + cy * 30 * z;
        c.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(0.78 + 0.24 * d).toFixed(3)})`;
        c.style.opacity = (0.38 + 0.62 * d).toFixed(2);
        c.style.zIndex = z > 0 ? "10" : "1";
      });
      if (!still) raf = requestAnimationFrame(frame);
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef, cardRef, stageRef]);
}

/** The rotating 3D sphere of skill tags. */
function useSphere(ref: React.RefObject<HTMLDivElement | null>, count: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tags = [...el.querySelectorAll<HTMLElement>(".st")];
    const n = tags.length;
    if (!n) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pts = tags.map((_, i) => {
      const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });
    let vx = 0.002, vy = 0.004, tvx = vx, tvy = vy, rx = 0.35, ry = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tvy = ((e.clientX - r.left) / r.width - 0.5) * 0.035;
      tvx = -((e.clientY - r.top) / r.height - 0.5) * 0.035;
    };
    const onLeave = () => {
      tvx = 0.002;
      tvy = 0.004;
    };
    const frame = () => {
      vx += (tvx - vx) * 0.05;
      vy += (tvy - vy) * 0.05;
      if (!still) {
        rx += vx;
        ry += vy;
      }
      const W = el.clientWidth * 0.34, H = el.clientHeight * 0.36, cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry);
      tags.forEach((t, i) => {
        const [x, y, z] = pts[i];
        const x1 = x * cY + z * sY, z1 = -x * sY + z * cY, y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX, d = (z2 + 1) / 2;
        t.style.transform = `translate(-50%,-50%) translate(${(x1 * W).toFixed(1)}px,${(y1 * H).toFixed(1)}px) scale(${(0.62 + 0.5 * d).toFixed(3)})`;
        t.style.opacity = (0.28 + 0.72 * d).toFixed(2);
        t.style.zIndex = String(Math.round(d * 100));
      });
      if (!still) raf = requestAnimationFrame(frame);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    frame();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref, count]);
}

function countUp(root: Element) {
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    if (!end) return;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** Cards rise into place as they scroll into view; content already on screen shows immediately. */
function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>(".rv")];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    document.documentElement.classList.add("motion");
    const reveal = (e: HTMLElement) => {
      if (e.classList.contains("in")) return;
      setTimeout(() => {
        e.classList.add("in");
        countUp(e);
      }, Number(e.dataset.d || 0));
    };
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            io.unobserve(en.target);
            reveal(en.target as HTMLElement);
          }
        }),
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((e) => io.observe(e));
    const fallback = setTimeout(() => els.forEach(reveal), 6000);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
      document.documentElement.classList.remove("motion");
    };
  }, [rootRef]);
}

/** Subtle 3D tilt + glare on hover for elements with .tilt. */
function useTilt(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(".tilt");
      if (current && current !== t) {
        current.style.transform = "";
        current = null;
      }
      if (!t) return;
      current = t;
      const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.style.transform = `perspective(700px) rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg) translateZ(8px)`;
      t.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      t.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const onLeave = () => {
      if (current) current.style.transform = "";
      current = null;
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [rootRef]);
}

/* ---------------------------------------------------------------- pieces */

function CopyButton({ text, label, icon }: { text: string; label: string; icon: IconName }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          },
          () => undefined,
        )
      }
    >
      <Icon name={done ? "check" : icon} />
      {done ? "Copied" : text}
    </button>
  );
}

function Authors({ authors, self }: { authors: ProfilePublication["authors"]; self: string }) {
  return (
    <>
      {authors.map((a, i) =>
        a.id ? (
          <Link key={i} href={`/people/${a.id}`} className={a.id === self ? "self" : ""}>
            <Avatar name={a.name} src={a.photo} size={20} />
            {shortName(a.name)}
          </Link>
        ) : (
          <span key={i} className="ext-a" title="Not in any of your groups">
            {a.name}
          </span>
        ),
      )}
    </>
  );
}

function PubCard({ p, i, max }: { p: ProfilePublication; i: number; max: number }) {
  const palette = ["var(--lagoon)", "var(--iris)", "var(--coral)", "var(--saffron)", "var(--mint)"];
  let h = 0;
  for (const c of p.venue) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const visible = p.authors.filter((a) => a.id);
  const names = [...p.authors.map((a) => shortName(a.name).split(" ").slice(-1)[0]), ...p.external_authors];
  return (
    <article className="pcard glass tilt" style={{ ["--c" as string]: palette[h % palette.length], ["--i" as string]: i }}>
      <div className="pc-cover">
        <div className="pc-top">
          <span className="pc-venue">{p.venue || "Unpublished venue"}</span>
          <span className="pc-type">{p.kind === "journal" ? "Journal" : "Conference"}</span>
        </div>
        <span className="pc-cite">
          <b>{fmt(p.citations)}</b> citations
        </span>
        <span className="pc-year" aria-hidden="true">
          {p.year}
        </span>
      </div>
      <div className="pc-body">
        <h4>{p.title}</h4>
        <div className="pc-auth">
          <div className="pc-stack">
            {visible.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/people/${a.id}`} title={a.name}>
                <Avatar name={a.name} src={a.photo} size={30} />
              </Link>
            ))}
          </div>
          <span>
            {names.slice(0, 3).join(", ")}
            {names.length > 3 ? " et al." : ""} · {p.year}
          </span>
        </div>
        <div className="pc-foot">
          <span className="cbar" style={{ flex: 1, width: "auto" }}>
            <i style={{ width: `${Math.max(4, (p.citations / Math.max(1, max)) * 100).toFixed(1)}%` }} />
          </span>
          {p.doi && (
            <a className="doi" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" title="Open the paper">
              <Icon name="arrow" />
              <span>Open paper</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- view */

export function ProfileView({ data }: { data: ProfileData }) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "journal" | "conference">("all");
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useHero(heroRef, cardRef, stageRef);
  useSphere(sphereRef, data.skills.length);
  useReveal(rootRef);
  useTilt(rootRef);

  const pubs = data.publications;
  const PUB_PAGE = 8;
  const cites = pubs.reduce((s, p) => s + p.citations, 0);
  const h = hIndex(pubs.map((p) => p.citations));
  const maxCites = pubs.length ? Math.max(...pubs.map((p) => p.citations)) : 0;
  const firstYear = data.experiences.length ? Math.min(...data.experiences.map((e) => e.start_year)) : (data.joinedYear ?? data.thisYear);
  const yrs = Math.max(0, data.thisYear - firstYear);
  const years = yearSeries(pubs, data.thisYear - 9, data.thisYear);
  const citeYears = yearSeries(pubs, data.thisYear - 9, data.thisYear, (rows) => rows.reduce((s, r) => s + r.citations, 0));
  const journals = pubs.filter((p) => p.kind === "journal").length;
  const venues = topCounts(pubs.map((p) => p.venue), 4);
  const top = [...pubs].sort((a, b) => b.citations - a.citations).slice(0, 3);
  const coauthors = new Set(pubs.flatMap((p) => p.authors.map((a) => a.id)).filter((id) => id && id !== data.id)).size;
  const shown = filter === "all" ? pubs : pubs.filter((p) => p.kind === filter);
  const achievements = [...data.achievements].sort((a, b) => b.year - a.year);
  const research = data.skills.filter((s) => s.category === "research");
  const [c1, c2] = colorsFor(data.name);
  const ring = 2 * Math.PI * 26;

  const tokens = useMemo(
    () => [...new Set(pubs.map((p) => String(p.year)))].concat([`h=${h}`, `${fmt(cites)} cites`, `${pubs.length} papers`], [...new Set(pubs.map((p) => p.venue))].filter((v) => v && v.length < 9), ["Σ", "∫", "λ", "π", "∇", "p<0.05"]),
    [pubs, h, cites],
  );
  const orbit: [IconName, string][] = [
    ["chart", `h-index ${h}`],
    ["star", `${fmt(cites)} citations`],
    ["book", `${pubs.length} ${pubs.length === 1 ? "paper" : "papers"}`],
    ...research.slice(0, 2).map((s) => ["spark", s.skill] as [IconName, string]),
    achievements[0] ? [ACH[achievements[0].kind].icon, `${achievements[0].title.split(",")[0]} · ${achievements[0].year}`] : ["users", `${coauthors} co-authors`],
  ];
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
  const xs = [...data.experiences].sort((a, b) => a.start_year - b.start_year);
  const span = Math.max(1, data.thisYear - firstYear);
  const pos = (y: number) => ((y - firstYear) / span) * 100;
  const lanes: number[] = [];
  const segs = xs.map((e, i) => {
    const to = e.end_year ?? data.thisYear;
    let lane = 0;
    while (lanes[lane] !== undefined && lanes[lane] > e.start_year) lane++;
    lanes[lane] = to;
    return { e, i, l: pos(e.start_year), w: Math.max(3, pos(to) - pos(e.start_year)), lane };
  });
  const step = span > 14 ? 4 : span > 7 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = firstYear; y < data.thisYear; y += step) ticks.push(y);
  const mono = (s: string) =>
    s
      .split("·")[0]
      .trim()
      .split(/\s+/)
      .filter((w) => /^[A-Z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || "•";

  return (
    <section className="view" ref={rootRef}>
      <Link className="back enter" href={data.groups[0] ? `/groups/${data.groups[0].slug}` : "/people"}>
        <Icon name="back" />
        {data.groups[0]?.name ?? "People"}
      </Link>

      {/* ---------- hero ---------- */}
      <section className="phero" ref={heroRef} style={{ ["--c1" as string]: c1, ["--c2" as string]: c2 }}>
        <HeroField tokens={tokens} />
        <div className="ph-objs" aria-hidden="true">
          <div className="obj" style={{ right: "5%", top: "9%", ["--dx" as string]: "-46px", ["--dy" as string]: "-34px" }}>
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
          <div className="obj" style={{ left: "1%", bottom: "3%", ["--dx" as string]: "34px", ["--dy" as string]: "26px" }}>
            <div className="obj-p">
              <div className="gyro">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="obj" style={{ left: "36%", top: "6%", ["--dx" as string]: "-26px", ["--dy" as string]: "20px" }}>
            <span className="orb" style={{ ["--sz" as string]: "30px", ["--c" as string]: "var(--c2)" }} />
          </div>
          <div className="obj" style={{ right: "20%", bottom: "7%", ["--dx" as string]: "54px", ["--dy" as string]: "-30px" }}>
            <span className="orb" style={{ ["--sz" as string]: "54px", ["--c" as string]: "var(--c1)", animationDelay: "-3s" }} />
          </div>
          <div className="obj" style={{ right: "3%", bottom: "34%", ["--dx" as string]: "-22px", ["--dy" as string]: "44px" }}>
            <span className="orb" style={{ ["--sz" as string]: "20px", ["--c" as string]: "var(--saffron)", animationDelay: "-5s" }} />
          </div>
        </div>
        <div className="ph-grid">
          <div className="stage" ref={stageRef}>
            <div className="orbit" aria-hidden="true">
              {orbit.map(([icon, text]) => (
                <span className="oc" key={text}>
                  <Icon name={icon} />
                  {text}
                </span>
              ))}
            </div>
            <div className="card-in">
              <div className="floaty">
                <div className="idcard" ref={cardRef}>
                  <div className="id-photo">
                    <span className="halo" />
                    {data.photoUrl ? <img src={data.photoUrl} alt={`Photo of ${data.name}`} /> : <span className="id-initials">{initialsOf(data.name)}</span>}
                    <span className="id-tag">{data.groups.length ? data.groups.map((g) => g.short_code).join(" · ") : "FACULTY"}</span>
                    {data.canEdit && (
                      <Link className="id-cam" href={data.isOwn ? "/profile/edit#photo" : `/profile/edit?person=${data.id}#photo`} aria-label="Change photo" title="Change photo">
                        <Icon name="edit" />
                      </Link>
                    )}
                  </div>
                  <div className="id-ring" title={`Profile ${data.completeness}% complete`}>
                    <svg viewBox="0 0 64 64" aria-hidden="true">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="5" />
                      <circle cx="32" cy="32" r="26" fill="none" style={{ stroke: "var(--lagoon)" }} strokeWidth="5" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - data.completeness / 100)} transform="rotate(-90 32 32)" />
                    </svg>
                    <b>
                      {data.completeness}
                      <small>%</small>
                    </b>
                  </div>
                  <div className="id-strip">
                    <div className="t">
                      <b>{data.name}</b>
                      <span>{data.title}</span>
                    </div>
                    <span className="id-uni">NU</span>
                  </div>
                  <div className="id-foot mono">
                    <span>FACULTY ATLAS</span>
                    <span>{data.orcid ? data.orcid.slice(-9) : (data.joinedYear ?? "")}</span>
                  </div>
                  <span className="id-sheen" />
                </div>
              </div>
            </div>
            <span className="stage-shadow" />
          </div>

          <div className="ph-info">
            <div className="p-badges enter" style={{ ["--d" as string]: ".15s" }}>
              {data.groups.length ? (
                data.groups.map((g) => (
                  <Link key={g.id} href={`/groups/${g.slug}`} className="chip" style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }}>
                    {g.short_code} · {g.name}
                  </Link>
                ))
              ) : (
                <span className="chip" style={{ ["--c" as string]: "var(--ink-3)" }}>
                  Not in a group yet
                </span>
              )}
              {data.status !== "active" && (
                <span className="chip" style={{ ["--c" as string]: "var(--saffron)" }}>
                  {data.status === "invited" ? "Not activated" : "Deactivated"}
                </span>
              )}
            </div>
            <h1 className="ph-name" aria-label={data.name}>
              <span aria-hidden="true">{nameLetters}</span>
            </h1>
            <p className="ph-role enter" style={{ ["--d" as string]: ".55s" }}>
              {[data.title, data.department].filter(Boolean).join(" · ")}
            </p>
            {data.bio ? (
              <p className="ph-bio enter" style={{ ["--d" as string]: ".7s" }}>
                {data.bio}
              </p>
            ) : (
              <p className="ph-bio enter muted" style={{ ["--d" as string]: ".7s" }}>
                No bio yet.
              </p>
            )}
            <ul className="p-contact enter" style={{ ["--d" as string]: ".85s" }}>
              <li>
                <CopyButton text={data.email} label="email" icon="mail" />
              </li>
              {data.phone_ext && (
                <li>
                  <Icon name="key" />
                  {data.phone_ext}
                </li>
              )}
              {data.office && (
                <li>
                  <Icon name="home" />
                  {data.office}
                </li>
              )}
              {data.orcid && (
                <li>
                  <a href={`https://orcid.org/${data.orcid}`} target="_blank" rel="noreferrer" className="orcid-link">
                    <Icon name="user" />
                    ORCID {data.orcid}
                  </a>
                </li>
              )}
            </ul>
            <div className="ph-facts enter" style={{ ["--d" as string]: ".95s" }}>
              <span>
                <b>{coauthors}</b> co-authors at Northfield
              </span>
              {data.joinedYear && (
                <span>
                  Joined <b>{data.joinedYear}</b>
                </span>
              )}
              <span>
                <b>{data.department || "No department"}</b>
              </span>
            </div>
            <div className="p-actions enter" style={{ ["--d" as string]: "1.05s", justifyContent: "flex-start" }}>
              {data.cv?.url && (
                <a className="btn btn-ghost" href={data.cv.url} target="_blank" rel="noreferrer">
                  <Icon name="eye" />
                  View CV
                </a>
              )}
              {data.canEdit && (
                <Link className="btn btn-primary" href={data.isOwn ? "/profile/edit" : `/profile/edit?person=${data.id}`}>
                  <Icon name="edit" />
                  {data.isOwn ? "Update profile" : "Edit profile"}
                </Link>
              )}
              {data.isAdminView && (
                <Link className="btn" href={`/people/${data.id}/manage`}>
                  <Icon name="shield" />
                  Manage
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- bento ---------- */}
      <section className="bento">
        <div className="s3 rv" data-d="0">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--lagoon)" }}>
            <div className="st-top">
              <span className="k-label">Publications</span>
              <Spark id={`${uid}s1`} values={years.map((y) => y.v)} color="var(--lagoon)" />
            </div>
            <b data-count={pubs.length}>{fmt(pubs.length)}</b>
            <small>{pubs.filter((p) => p.year === data.thisYear).length} published in {data.thisYear}</small>
          </div>
        </div>
        <div className="s3 rv" data-d="90">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--iris)" }}>
            <div className="st-top">
              <span className="k-label">Citations</span>
              <Spark id={`${uid}s2`} values={citeYears.map((y) => y.v)} color="var(--iris)" />
            </div>
            <b data-count={cites}>{fmt(cites)}</b>
            <small>Most cited paper: {fmt(maxCites)}</small>
          </div>
        </div>
        <div className="s3 rv" data-d="180">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--coral)" }}>
            <div className="st-top">
              <span className="k-label">h-index</span>
              <Gauge pct={(h / 30) * 100} color="var(--coral)" />
            </div>
            <b data-count={h}>{h}</b>
            <small>
              {h} {h === 1 ? "paper" : "papers"} cited {h}+ times
            </small>
          </div>
        </div>
        <div className="s3 rv" data-d="270">
          <div className="stat2 glass tilt" style={{ ["--c" as string]: "var(--saffron)" }}>
            <div className="st-top">
              <span className="k-label">Years of experience</span>
              <Gauge pct={(yrs / 30) * 100} color="var(--saffron)" />
            </div>
            <b data-count={yrs}>{yrs}</b>
            <small>{data.experiences.length ? `Career since ${firstYear}` : "No career entries yet"}</small>
          </div>
        </div>

        <div className="card glass s8 rv" data-d="60">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic">
                <Icon name="chart" />
              </span>
              Research momentum
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
          {pubs.length ? <ComboChart id={`${uid}cc`} years={years} cBar="var(--lagoon)" cLine="var(--coral)" /> : <div className="empty">No publications yet.</div>}
        </div>

        <div className="card glass s4 rv" data-d="160">
          <h3 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--coral)" }}>
              <Icon name="star" />
            </span>
            Output & impact
          </h3>
          <div className="donut">
            <Donut journals={journals} conferences={pubs.length - journals} />
            <ul className="dl">
              <li>
                <i style={{ ["--c" as string]: "var(--iris)" }} />
                Journal articles<b>{journals}</b>
              </li>
              <li>
                <i style={{ ["--c" as string]: "var(--lagoon)" }} />
                Conference papers<b>{pubs.length - journals}</b>
              </li>
            </ul>
          </div>
          {venues.length > 0 && (
            <>
              <span className="eyebrow">Top venues</span>
              <div className="hbars">
                {venues.map(([v, n]) => (
                  <div className="hbar" key={v} style={{ ["--c" as string]: "var(--coral)" }}>
                    <span title={v}>{v}</span>
                    <div className="track">
                      <i style={{ width: `${((n / venues[0][1]) * 100).toFixed(1)}%` }} />
                    </div>
                    <b>{n}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card glass s7 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--mint)" }}>
                <Icon name="spark" />
              </span>
              Skills & expertise
            </h3>
            <div className="legend">
              {(Object.keys(CAT_LABEL) as (keyof typeof CAT_LABEL)[])
                .filter((c) => data.skills.some((s) => s.category === c))
                .map((c) => (
                  <span key={c}>
                    <i style={{ ["--c" as string]: CAT_COLOR[c] }} />
                    {CAT_LABEL[c]}
                  </span>
                ))}
            </div>
          </div>
          {data.skills.length ? (
            <>
              <div className="sphere" ref={sphereRef}>
                <div className="rings" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                {data.skills.map((s, i) => (
                  <span key={s.skill} className={`st${s.category === "research" && research.indexOf(s) < 2 && i < 40 ? " big" : ""}`} style={{ ["--c" as string]: CAT_COLOR[s.category] }}>
                    {s.skill}
                  </span>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Move your pointer over the sphere to turn it.
              </p>
            </>
          ) : (
            <div className="empty">No skills listed yet.</div>
          )}
        </div>

        <div className="card glass s5 rv" data-d="120">
          <h3 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--coral)" }}>
              <Icon name="file" />
            </span>
            Curriculum vitae
          </h3>
          {data.cv ? (
            <div className="cv2">
              <a className="cvstack" href={data.cv.url ?? "#"} target="_blank" rel="noreferrer" aria-label="Open CV">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="sheet" style={{ ["--i" as string]: i }}>
                    <i className="h" />
                    <i className="s" />
                    <i />
                    <i style={{ width: "85%" }} />
                    <i style={{ width: "92%" }} />
                    <i className="s" style={{ marginTop: 6 }} />
                    <i />
                    <i style={{ width: "78%" }} />
                    <i style={{ width: "88%" }} />
                    {i === 2 && <em>PDF</em>}
                  </span>
                ))}
              </a>
              <div className="cv-meta">
                <h4>{data.cv.fileName}</h4>
                <p className="meta mono">
                  {formatBytes(data.cv.sizeBytes)}
                  {data.cv.pages ? ` · ${data.cv.pages} pages` : ""}
                  <br />
                  Updated {new Date(data.cv.uploadedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </p>
                {data.cv.url && (
                  <div className="actions">
                    <a className="btn btn-sm btn-primary" href={data.cv.url} target="_blank" rel="noreferrer">
                      <Icon name="eye" />
                      Open
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty">
              <Icon name="file" width={22} height={22} />
              <span>{data.isOwn ? "You have not uploaded a CV yet. It adds 20% to your profile." : `${shortName(data.name).split(" ")[0]} has not uploaded a CV yet.`}</span>
              {data.canEdit && (
                <Link className="btn btn-sm btn-primary" href={data.isOwn ? "/profile/edit#cv" : `/profile/edit?person=${data.id}#cv`}>
                  <Icon name="upload" />
                  Upload CV
                </Link>
              )}
            </div>
          )}
        </div>

        {/* career journey */}
        <div className="card glass s12 rv career" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic">
                <Icon name="brief" />
              </span>
              Career journey
            </h3>
            <div className="legend">
              <span>
                <i style={{ ["--c" as string]: "var(--lagoon)" }} />
                Positions
              </span>
              <span>
                <i style={{ ["--c" as string]: "var(--iris)" }} />
                Education
              </span>
              <span className="mono">
                {yrs} years · {xs.length} {xs.length === 1 ? "stage" : "stages"}
              </span>
            </div>
          </div>
          {xs.length === 0 ? (
            <div className="empty">No career entries yet.</div>
          ) : (
            <>
              <div className="ribbon">
                <div className="rb-track" style={{ height: Math.max(1, lanes.length) * 40 }}>
                  {segs.map((s) => (
                    <div
                      key={s.e.id}
                      className={`rb-seg${s.e.is_education ? " edu" : ""}${!s.e.end_year ? " now" : ""}`}
                      style={{ left: `${s.l.toFixed(2)}%`, width: `${s.w.toFixed(2)}%`, top: s.lane * 40, ["--i" as string]: s.i }}
                      title={`${s.e.role}, ${s.e.start_year} to ${s.e.end_year ?? "now"}`}
                    >
                      <i />
                      <span>{s.e.role.replace(/,.*$/, "")}</span>
                    </div>
                  ))}
                </div>
                <div className="rb-axis">
                  {ticks.map((y) => (
                    <span key={y} style={{ left: `${pos(y).toFixed(2)}%` }}>
                      {y}
                    </span>
                  ))}
                  <span className="nowtag" style={{ left: "100%" }}>
                    Now
                  </span>
                  <span className="rb-dot" />
                </div>
              </div>
              <ol className="xp">
                {xs.map((e, i) => {
                  const n = (e.end_year ?? data.thisYear) - e.start_year;
                  return (
                    <li key={e.id} className={`xp-card tilt${!e.end_year ? " now" : ""}${e.is_education ? " edu" : ""}`} style={{ ["--i" as string]: i }}>
                      <div className="xp-top">
                        <span className="xp-mono" aria-hidden="true">
                          {mono(e.organization)}
                        </span>
                        <div className="xp-yrs">
                          <b>{e.start_year}</b>
                          <span>{e.end_year ?? "Now"}</span>
                        </div>
                      </div>
                      <span className="eyebrow">
                        {e.is_education ? "Education" : "Position"} · {n} {n === 1 ? "year" : "years"}
                      </span>
                      <h4>{e.role}</h4>
                      <p className="org">{e.organization}</p>
                      {e.description && <p className="d">{e.description}</p>}
                      {!e.end_year && (
                        <span className="chip xp-cur" style={{ ["--c" as string]: "var(--mint)" }}>
                          <span className="pulse" />
                          Current role
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>

        {/* achievements */}
        <div className="card glass s12 rv" data-d="0">
          <h3 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--saffron)" }}>
              <Icon name="award" />
            </span>
            Achievements & certifications
          </h3>
          {achievements.length === 0 ? (
            <div className="empty">No awards, grants or certificates added yet.</div>
          ) : (
            <div className="flips">
              {achievements.map((a, i) => {
                const meta = ACH[a.kind];
                const on = flipped.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flip${on ? " on" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-pressed={on}
                    aria-label={`${a.title}, ${a.year}. Show details`}
                    style={{ ["--c" as string]: meta.c, ["--i" as string]: i }}
                    onClick={() =>
                      setFlipped((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                  >
                    <div className="flip-in">
                      <div className="face front">
                        <div className="medal-in">
                          <span className="medal">
                            <Icon name={meta.icon} />
                          </span>
                        </div>
                        <span className="yr mono">{a.year}</span>
                        <span className="eyebrow">{meta.label}</span>
                        <b>{a.title}</b>
                        <small className="flip-hint">
                          Flip for details <Icon name="arrow" />
                        </small>
                      </div>
                      <div className="face back">
                        <span className="eyebrow" style={{ color: "rgba(255,255,255,.82)" }}>
                          {meta.label} · {a.year}
                        </span>
                        <b>{a.organization || a.title}</b>
                        <p>{meta.back(a.organization, a.year)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* publications */}
        <div className="card glass s12 rv" data-d="0">
          <div className="c-head">
            <h3 className="c-title">
              <span className="ic">
                <Icon name="book" />
              </span>
              Publications & journals
            </h3>
            <div className="toolbar" style={{ padding: 0 }}>
              <div className="tabs" role="tablist">
                {(["all", "journal", "conference"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={filter === t} className={filter === t ? "on" : ""} onClick={() => { setFilter(t); setShowAll(false); }}>
                    {t === "all" ? "All" : t === "journal" ? "Journals" : "Conferences"}
                    <em>{t === "all" ? pubs.length : pubs.filter((p) => p.kind === t).length}</em>
                  </button>
                ))}
              </div>
              {data.canEdit && (
                <Link className="btn btn-sm btn-primary" href={data.isOwn ? "/profile/edit#publications" : `/profile/edit?person=${data.id}#publications`}>
                  <Icon name="plus" />
                  Add publication
                </Link>
              )}
            </div>
          </div>
          {top.length >= 2 && filter === "all" && (
            <>
              <span className="eyebrow">Most cited work</span>
              <div className="pc-grid">
                {top.map((p, i) => (
                  <PubCard key={p.id} p={p} i={i} max={maxCites} />
                ))}
              </div>
              <span className="eyebrow" style={{ marginTop: 6 }}>
                All publications
              </span>
            </>
          )}
          {shown.length === 0 ? (
            <div className="empty">Nothing here yet.</div>
          ) : (
            <ul className="pubs">
              {(showAll ? shown : shown.slice(0, PUB_PAGE)).map((p, i) => (
                <li key={p.id} className="pub" style={{ ["--i" as string]: i }}>
                  <div className="pub-year">{p.year}</div>
                  <div style={{ minWidth: 0 }}>
                    <h4>{p.title}</h4>
                    <p className="venue">
                      <span className="chip" style={{ ["--c" as string]: p.kind === "journal" ? "var(--iris)" : "var(--lagoon)" }}>
                        {p.kind === "journal" ? "Journal" : "Conference"}
                      </span>
                      <i>{p.venue}</i>
                    </p>
                    <div className="authors">
                      <Authors authors={p.authors} self={data.id} />
                      {p.external_authors.map((e) => (
                        <span key={e}>{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pub-side">
                    <div className="cites">
                      <b>{fmt(p.citations)}</b>
                      <span>citations</span>
                    </div>
                    <span className="cbar">
                      <i style={{ width: `${Math.max(4, (p.citations / Math.max(1, maxCites)) * 100).toFixed(1)}%` }} />
                    </span>
                    {p.doi && (
                      <a className="doi" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" title="Open the paper">
                        <Icon name="arrow" />
                        <span>{p.doi}</span>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {shown.length > PUB_PAGE && (
            <button type="button" className="btn btn-ghost pubs-more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${shown.length} publications`}
            </button>
          )}
        </div>
      </section>
    </section>
  );
}
