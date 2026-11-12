import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

/** Signed-in app shell: frosted sidebar + top bar. Sign-in pages live in (auth) without this shell. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="wrap">
          <Topbar />
          {children}
        </div>
      </main>
    </div>
  );
}
