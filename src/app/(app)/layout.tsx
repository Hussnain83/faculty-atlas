import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { requireAccount } from "@/lib/auth";

/** Signed-in app shell: frosted sidebar + top bar. Sign-in pages live in (auth) without this shell. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="wrap">
          <Topbar />
          <Suspense fallback={<ViewLoading />}>
            <Gate>{children}</Gate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/** Re-checks the session on the server before any page content renders (the proxy check is only optimistic). */
async function Gate({ children }: { children: ReactNode }) {
  await requireAccount();
  return children;
}

function ViewLoading() {
  return (
    <section className="view" aria-busy="true">
      <div className="card glass">
        <p className="muted">Loading…</p>
      </div>
    </section>
  );
}
