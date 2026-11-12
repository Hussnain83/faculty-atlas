import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">People directory</p>
          <h1>Everyone at the faculty</h1>
          <p className="lede">Only people registered here can join a group. Members see the people in their own groups.</p>
        </div>
      </header>
      <div className="empty glass">
        <Icon name="users" width={22} height={22} />
        <span>The directory is empty. Sample people are loaded in Phase 1, and admins can add people in Phase 3.</span>
      </div>
    </section>
  );
}
