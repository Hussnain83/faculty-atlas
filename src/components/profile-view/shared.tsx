"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect } from "react";
import type { ProfilePublication } from "@/components/profile-view/types";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

/** Pieces shared by the profile and group pages. */

export const fmt = (n: number) => n.toLocaleString("en-US");
export const shortName = (n: string) => n.replace(/^(Dr.|Prof.)s+/, "");

export function countUp(root: Element) {
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
export function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
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
export function useTilt(rootRef: React.RefObject<HTMLElement | null>) {
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

export function Authors({ authors, self }: { authors: ProfilePublication["authors"]; self: string }) {
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

export function PubCard({ p, i, max }: { p: ProfilePublication; i: number; max: number }) {
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
