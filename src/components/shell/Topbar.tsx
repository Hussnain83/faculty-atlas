import { Suspense } from "react";
import { GlobalSearch } from "@/components/shell/GlobalSearch";
import { SupabaseStatus } from "@/components/shell/SupabaseStatus";
import { UserChip } from "@/components/shell/UserChip";

export function Topbar() {
  return (
    <div className="topbar">
      <GlobalSearch />
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
      <Suspense fallback={null}>
        <UserChip />
      </Suspense>
    </div>
  );
}
