/** Animated SVG charts from the approved prototype. Animations are CSS-driven (see profile.css). */
import { niceMax } from "@/lib/stats";

type Point = { l: string; v: number };

function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Bars per year plus a running-total line on its own axis. */
export function ComboChart({ id, years, cBar, cLine }: { id: string; years: Point[]; cBar: string; cLine: string }) {
  const W = 640, H = 250, pl = 30, pr = 40, pt = 24, pb = 28, iw = W - pl - pr, ih = H - pt - pb, base = pt + ih;
  const maxB = niceMax(Math.max(1, ...years.map((d) => d.v)));
  const cs = years.reduce<number[]>((acc, d) => [...acc, (acc[acc.length - 1] ?? 0) + d.v], []);
  const maxC = niceMax(Math.max(1, cs[cs.length - 1] ?? 0));
  const n = years.length, slot = iw / n, bw = Math.min(30, slot * 0.46);
  const pts = cs.map((v, i) => [pl + i * slot + slot / 2, base - (v / maxC) * ih] as [number, number]);
  const line = smooth(pts);
  const end = pts[n - 1];
  return (
    <svg className="chart combo" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Papers per year and running total, ${years[0].l} to ${years[n - 1].l}`}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: cBar }} />
          <stop offset="1" style={{ stopColor: cBar, stopOpacity: 0.3 }} />
        </linearGradient>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: cLine, stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: cLine, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => {
        const y = base - f * ih;
        return (
          <g key={f}>
            <line className="grid" x1={pl} x2={W - pr} y1={y} y2={y} />
            <text className="tick" x={pl - 8} y={y + 4} textAnchor="end">
              {+(maxB * f).toFixed(1)}
            </text>
            <text className="tick" x={W - pr + 8} y={y + 4} style={{ fill: cLine }}>
              {+(maxC * f).toFixed(1)}
            </text>
          </g>
        );
      })}
      <path className="area" d={`${line}L${end[0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z`} fill={`url(#${id}a)`} />
      {years.map((d, i) => {
        const x = pl + i * slot + (slot - bw) / 2, bh = (d.v / maxB) * ih, y = base - bh, r = Math.min(7, bh / 2, bw / 2);
        return (
          <g className="slot" key={d.l}>
            <title>{`${d.l}: ${d.v} ${d.v === 1 ? "paper" : "papers"}, ${cs[i]} in total`}</title>
            <rect x={pl + i * slot} y={pt} width={slot} height={ih} fill="transparent" />
            {d.v > 0 && (
              <path
                className="bar"
                style={{ ["--i" as string]: i }}
                d={`M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${base}Z`}
                fill={`url(#${id}b)`}
              />
            )}
            <text className="xl" x={x + bw / 2} y={H - 6} textAnchor="middle">
              &apos;{d.l.slice(2)}
            </text>
          </g>
        );
      })}
      <path className="ln" pathLength={1} d={line} fill="none" style={{ stroke: cLine }} strokeWidth={3} strokeLinecap="round" />
      {pts.map((q, i) => (
        <circle key={i} className="pt" style={{ ["--i" as string]: i, fill: "var(--white)", stroke: cLine }} cx={q[0]} cy={q[1]} r={i === n - 1 ? 5.5 : 3.5} strokeWidth={2.5} />
      ))}
      <circle className="pulse-ring" cx={end[0]} cy={end[1]} r={6} fill="none" style={{ stroke: cLine }} strokeWidth={2} />
    </svg>
  );
}

export function Spark({ id, values, color }: { id: string; values: number[]; color: string }) {
  const W = 150, H = 46, max = Math.max(1, ...values), st = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * st, H - 4 - (v / max) * (H - 10)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const e = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path className="area" d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${id})`} />
      <path className="sl" pathLength={1} d={line} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle className="pt" cx={e[0] - 1} cy={e[1]} r={3.5} style={{ fill: color }} stroke="white" strokeWidth={2} />
    </svg>
  );
}

export function Gauge({ pct, color }: { pct: number; color: string }) {
  return (
    <svg className="gauge" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="6" />
      <circle
        className="arc"
        cx="28"
        cy="28"
        r="22"
        fill="none"
        style={{ stroke: color, strokeDasharray: `${Math.max(1, Math.min(100, pct)).toFixed(1)} 100` }}
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={100}
        transform="rotate(-90 28 28)"
      />
    </svg>
  );
}

export function Donut({ journals, conferences }: { journals: number; conferences: number }) {
  const t = journals + conferences;
  const both = journals > 0 && conferences > 0;
  const pa = t ? (journals / t) * 100 : 0, pb = t ? (conferences / t) * 100 : 0, g = both ? 1.2 : 0;
  return (
    <svg className="dn" viewBox="0 0 120 120" role="img" aria-label={`${journals} journal articles and ${conferences} conference papers`}>
      <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(13,27,42,.06)" strokeWidth="14" />
      {journals > 0 && (
        <circle className="arc" cx="60" cy="60" r="46" fill="none" style={{ stroke: "var(--iris)", strokeDasharray: `${(pa - g).toFixed(2)} 100` }} strokeWidth="14" pathLength={100} transform="rotate(-90 60 60)" />
      )}
      {conferences > 0 && (
        <circle
          className="arc a2"
          cx="60"
          cy="60"
          r="46"
          fill="none"
          style={{ stroke: "var(--lagoon)", strokeDasharray: `${(pb - g).toFixed(2)} 100` }}
          strokeWidth="14"
          pathLength={100}
          transform={`rotate(${(-90 + pa * 3.6).toFixed(1)} 60 60)`}
        />
      )}
      <text className="dn-n" x="60" y="63" textAnchor="middle">
        {t}
      </text>
      <text className="dn-l" x="60" y="80" textAnchor="middle">
        papers
      </text>
    </svg>
  );
}
