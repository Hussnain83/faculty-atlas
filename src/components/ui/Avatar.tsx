/* eslint-disable @next/next/no-img-element -- signed storage URLs change every hour; next/image would cache stale ones */

const PAIRS: [string, string][] = [
  ["#0C9AA6", "#5864EC"],
  ["#F2614C", "#EE9B12"],
  ["#5864EC", "#F2614C"],
  ["#1FA872", "#0C9AA6"],
  ["#EE9B12", "#F2614C"],
  ["#7A5CE0", "#0C9AA6"],
];

export function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Prof\.)\s+/, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Two brand colours picked consistently from a name (used for avatars and profile cards). */
export function colorsFor(name: string): [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PAIRS[h % PAIRS.length];
}

/** A person's photo, or their initials on a colour picked from their name. */
export function Avatar({ name, src, size = 40, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  const [a1, a2] = colorsFor(name);
  return (
    <span className={`av ${className}`} style={{ ["--s" as string]: `${size}px`, ["--a1" as string]: a1, ["--a2" as string]: a2 }} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : initialsOf(name)}
    </span>
  );
}
