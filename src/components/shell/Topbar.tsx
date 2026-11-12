import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { SupabaseStatus } from "@/components/shell/SupabaseStatus";

export function Topbar() {
  return (
    <div className="topbar">
      <form className="search" role="search" action="/people">
        <Icon name="search" width={18} height={18} />
        <label className="sr-only" htmlFor="global-search">
          Search people, skills or groups
        </label>
        <input id="global-search" name="q" placeholder="Search people, skills or groups" autoComplete="off" />
        <kbd>Enter</kbd>
      </form>
      <Suspense
        fallback={
          <span className="pill">
            <span className="pulse" />
            Checking database…
          </span>
        }
      >
        <SupabaseStatus />
      </Suspense>
    </div>
  );
}
