import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createGroup } from "@/app/(app)/groups/actions";
import { GroupForm } from "@/components/admin/GroupForm";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";

export const metadata: Metadata = { title: "New group" };

export default function NewGroupPage() {
  return (
    <section className="view">
      <Link className="back" href="/groups">
        <Icon name="back" />
        Groups
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">Research groups</p>
          <h1>New group</h1>
          <p className="lede">After creating the group you can add members from the directory and choose a lead.</p>
        </div>
      </header>
      <section className="card glass">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <AdminOnly />
        </Suspense>
      </section>
    </section>
  );
}

async function AdminOnly() {
  const account = await requireAccount();
  if (!account.isAdmin) redirect("/groups");
  return <GroupForm action={createGroup} submitLabel="Create group" />;
}
