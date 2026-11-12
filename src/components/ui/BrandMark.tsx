import { useId } from "react";

export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--lagoon)" }} />
          <stop offset="1" style={{ stopColor: "var(--iris)" }} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id})`} />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
      <ellipse cx="20" cy="20" rx="4.6" ry="10.5" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.6" />
      <path d="M9.5 20h21" stroke="rgba(255,255,255,.85)" strokeWidth="1.6" />
      <circle cx="29" cy="12" r="2.6" fill="#FFD27A" />
    </svg>
  );
}
