import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { registerPerson } from "@/app/(app)/people/actions";
import { PersonForm } from "@/components/admin/PersonForm";
import { Icon } from "@/components/ui/Icon";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Register a person" };

export default function NewPersonPage() {
  return (
    <section className="view">
      <Link className="back" href="/people">
        <Icon name="back" />
        People
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">People directory</p>
          <h1>Register a person</h1>
          <p className="lede">
            Registering someone adds them to the directory and creates their account. They activate it themselves from
            Create account on the sign-in page, using this email.
          </p>
        </div>
      </header>
      <section className="card glass">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Form />
        </Suspense>
      </section>
    </section>
  );
}

async function Form() {
  const account = await requireAccount();
  if (!account.isAdmin) redirect("/people");
  const supabase = await createClient();
  const { data: groups } = await supabase.from("groups").select("id, name, short_code").is("archived_at", null).order("name");
  return <PersonForm action={registerPerson} groups={groups ?? []} submitLabel="Register person" />;
}
