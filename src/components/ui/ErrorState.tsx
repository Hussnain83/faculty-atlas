"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

/** Shown when a page fails to load. The message never includes server details; the digest matches the server log. */
export function ErrorState({ error, retry, homeHref = "/" }: { error: unknown; retry: () => void; homeHref?: string }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="view">
      <section className="locked glass" role="alert">
        <span className="lk-sil" aria-hidden="true" style={{ background: "linear-gradient(140deg, var(--coral), var(--saffron))" }}>
          <Icon name="info" />
        </span>
        <h1>Something went wrong</h1>
        <p>This page could not load. It is usually a brief connection problem, so trying again often works.</p>
        <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link className="btn btn-ghost" href={homeHref}>
            <Icon name="home" />
            Go to the overview
          </Link>
        </div>
        {digest && <p className="muted mono" style={{ fontSize: 12 }}>Reference: {digest}</p>}
      </section>
    </section>
  );
}
