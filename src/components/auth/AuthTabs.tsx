import Link from "next/link";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  return (
    <div className="auth-tabs" role="tablist">
      <Link href="/login" role="tab" aria-selected={active === "login"} className={active === "login" ? "on" : ""}>
        Sign in
      </Link>
      <Link href="/signup" role="tab" aria-selected={active === "signup"} className={active === "signup" ? "on" : ""}>
        Create account
      </Link>
      <span className="tab-ink" style={{ ["--x" as string]: active === "signup" ? 1 : 0 }} />
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="auth-card" aria-busy="true">
      <div className="af-step">
        <h2>Loading…</h2>
      </div>
    </div>
  );
}
