/** Research numbers shared by profile and group pages. */

export function hIndex(citations: number[]) {
  const sorted = [...citations].sort((a, b) => b - a);
  let h = 0;
  while (h < sorted.length && sorted[h] >= h + 1) h++;
  return h;
}

export function yearSeries<T extends { year: number }>(items: T[], from: number, to: number, value: (rows: T[]) => number = (rows) => rows.length) {
  const out: { l: string; v: number }[] = [];
  for (let y = from; y <= to; y++) out.push({ l: String(y), v: value(items.filter((i) => i.year === y)) });
  return out;
}

export function topCounts(values: string[], n: number) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/** A "nice" axis maximum: 4, 6, 8, 10, 20, 25, 50, 100… */
export function niceMax(m: number) {
  if (m <= 4) return 4;
  if (m <= 6) return 6;
  if (m <= 8) return 8;
  if (m <= 10) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  const n = m / p;
  return (n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
