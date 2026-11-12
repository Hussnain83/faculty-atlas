import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">Research groups</p>
          <h1>Groups</h1>
          <p className="lede">Groups bring people from the directory together. Open one to see its members and output.</p>
        </div>
      </header>
      <div className="empty glass">
        <Icon name="layers" width={22} height={22} />
        <span>No groups yet. Groups and their 3D collaboration maps arrive in Phases 3 and 6.</span>
      </div>
    </section>
  );
}
