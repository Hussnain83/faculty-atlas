import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Sign in" };

/** Placeholder until Phase 2 builds the 3D sign-in and account activation flow. */
export default function LoginPage() {
  return (
    <main className="relative z-[1] grid min-h-screen place-items-center px-4">
      <div className="card glass w-full max-w-md items-start" style={{ borderRadius: "var(--r-xl)", padding: 30 }}>
        <span className="brand">
          <BrandMark />
          <span>
            <b>Faculty Atlas</b>
            <small>Northfield University</small>
          </span>
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Sign-in is coming in Phase 2</h1>
        <p className="text-ink-2">
          The 3D sign-in screen, account activation with an email code and password reset are built in Phase 2.
        </p>
        <Link className="btn btn-primary" href="/">
          <Icon name="back" />
          Back to the app
        </Link>
      </div>
    </main>
  );
}
