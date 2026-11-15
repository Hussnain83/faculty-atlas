/** Placeholder blocks while a page loads, so the layout doesn't jump. Screen readers hear the label once. */
export function Skeleton({ label, variant = "list", rows = 5 }: { label: string; variant?: "list" | "grid" | "form"; rows?: number }) {
  return (
    <div className="skel-wrap" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div className="skel skel-head" aria-hidden="true" />
      {variant === "grid" ? (
        <div className="g-grid" aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="skel skel-card" style={{ ["--i" as string]: i }} />
          ))}
        </div>
      ) : (
        <div className="glass skel-panel" aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={`skel ${variant === "form" ? "skel-field" : "skel-row"}`} style={{ ["--i" as string]: i }} />
          ))}
        </div>
      )}
    </div>
  );
}
