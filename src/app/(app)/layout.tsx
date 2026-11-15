import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireAccount } from "@/lib/auth";

/** Signed-in app shell: frosted sidebar + top bar. Sign-in pages live in (auth) without this shell. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Sidebar />
      <main className="main" id="content" tabIndex={-1}>
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
      <Skeleton label="Loading" rows={4} />
    </section>
  );
}
