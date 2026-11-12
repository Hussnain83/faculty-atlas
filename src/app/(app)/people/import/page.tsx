import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CsvImport } from "@/components/admin/CsvImport";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import people" };

export default function ImportPage() {
  return (
    <section className="view">
      <Link className="back" href="/people">
        <Icon name="back" />
        People
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">People directory</p>
          <h1>Import people from a CSV file</h1>
          <p className="lede">You will see every row checked before anything is saved. People already in the directory are skipped.</p>
        </div>
      </header>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Importer />
      </Suspense>
    </section>
  );
}

async function Importer() {
  const account = await requireAccount();
  if (!account.isAdmin) redirect("/people");
  const supabase = await createClient();
  const [{ data: people }, { data: groups }] = await Promise.all([
    supabase.from("people").select("email"),
    supabase.from("groups").select("short_code").is("archived_at", null).order("short_code"),
  ]);
  return <CsvImport existingEmails={(people ?? []).map((p) => String(p.email))} groupCodes={(groups ?? []).map((g) => g.short_code)} />;
}
