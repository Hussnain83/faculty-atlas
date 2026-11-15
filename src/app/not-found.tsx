import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Page not found" };

/** Unknown addresses. Kept outside the app shell so it works signed in or out. */
export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <section className="locked glass" style={{ maxWidth: 480 }}>
        <span className="lk-sil" aria-hidden="true">
          <Icon name="search" />
        </span>
        <p className="eyebrow">Error 404</p>
        <h1>This page does not exist</h1>
        <p>The link may be old or mistyped. People and groups you can see are listed from the overview.</p>
        <Link className="btn btn-primary" href="/">
          <Icon name="home" />
          Go to the overview
        </Link>
      </section>
    </main>
  );
}
