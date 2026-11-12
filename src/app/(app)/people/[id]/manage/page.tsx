import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setPersonActive, updatePerson } from "@/app/(app)/people/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PersonForm } from "@/components/admin/PersonForm";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { requireAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR, STATUS_LABEL } from "@/lib/ui";

export const metadata: Metadata = { title: "Manage person" };

export default function ManagePersonPage(props: PageProps<"/people/[id]/manage">) {
  return (
    <section className="view">
      <Link className="back" href="/people">
        <Icon name="back" />
        People
      </Link>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Person params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function Person({ params, searchParams }: { params: PageProps<"/people/[id]/manage">["params"]; searchParams: PageProps<"/people/[id]/manage">["searchParams"] }) {
  const account = await requireAccount();
  const { id } = await params;
  if (!account.isAdmin) redirect(`/people/${id}`);
  const created = (await searchParams).created === "1";
  const supabase = await createClient();
  const { data: person } = await supabase
    .from("people")
    .select("id, user_id, full_name, email, title, department, office, phone_ext, joined_year, status, bio, photo_path, created_at, group_members(group_id, groups(id, slug, name, short_code, color))")
    .eq("id", /^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  // Row-level security returns nothing for people outside your groups.
  if (!person) {
    return (
      <section className="locked glass">
        <span className="lk-sil" aria-hidden="true">
          <Icon name="lock" />
        </span>
        <h1>This profile is only visible to its groups</h1>
        <p>You can see the people who share a research group with you. This person is not in any of your groups, or does not exist.</p>
      </section>
    );
  }

  const status = STATUS_LABEL[person.status];
  const groups = person.group_members.map((m) => m.groups).filter((g) => g !== null);

  const photo = (await signedUrls(supabase, "photos", [person.photo_path])).get(person.photo_path ?? "") ?? null;

  let lastSignIn: string | null = null;
  if (account.isAdmin && person.user_id) {
    const { data } = await createAdminClient().auth.admin.getUserById(person.user_id);
    lastSignIn = data.user?.last_sign_in_at ?? null;
  }

  return (
    <>
      {created && (
        <div className="hint" role="status">
          <Icon name="check" />
          <span>
            <b>{person.full_name}</b> is in the directory. They can now activate their account from <b>Create account</b> on the
            sign-in page using <b>{person.email}</b>.
          </span>
        </div>
      )}
      <header className="page-head">
        <div className="who-head">
          <Avatar name={person.full_name} src={photo} size={72} />
          <div>
            <p className="eyebrow">{person.department || "Directory entry"}</p>
            <h1>{person.full_name}</h1>
            <p className="lede">{person.title}</p>
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="chip" style={{ ["--c" as string]: status.color }}>
                {status.label}
              </span>
              {groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.slug}`} className="chip" style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }}>
                  {g.short_code} · {g.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {account.isAdmin ? (
        <div className="bento">
          <section className="card glass s8">
            <h2 className="c-title">
              <span className="ic">
                <Icon name="edit" />
              </span>
              Directory details
            </h2>
            <PersonForm action={updatePerson.bind(null, person.id)} person={person} submitLabel="Save changes" />
          </section>
          <section className="card glass s4">
            <h2 className="c-title">
              <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
                <Icon name="shield" />
              </span>
              Account
            </h2>
            <dl className="facts">
              <div>
                <dt>Status</dt>
                <dd>{status.label}</dd>
              </div>
              <div>
                <dt>Sign-in account</dt>
                <dd>{person.user_id ? "Created" : "Not created yet"}</dd>
              </div>
              <div>
                <dt>Last sign-in</dt>
                <dd>{lastSignIn ? new Date(lastSignIn).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{new Date(person.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</dd>
              </div>
            </dl>
            {person.status === "invited" && (
              <p className="muted" style={{ fontSize: 13 }}>
                Waiting for {person.full_name.split(" ").slice(-1)[0]} to activate the account with {person.email}.
              </p>
            )}
            <div className="actions">
              <Link className="btn btn-sm" href={`/people/${person.id}`}>
                <Icon name="eye" />
                View profile
              </Link>
              <Link className="btn btn-sm" href={`/profile/edit?person=${person.id}`}>
                <Icon name="edit" />
                Edit profile
              </Link>
              {person.status === "deactivated" ? (
                <ConfirmButton
                  run={setPersonActive.bind(null, person.id, true)}
                  label="Reactivate"
                  confirmLabel="Yes, reactivate"
                  question="Give this person access again?"
                  icon={<Icon name="check" />}
                />
              ) : (
                <ConfirmButton
                  run={setPersonActive.bind(null, person.id, false)}
                  label="Deactivate"
                  confirmLabel="Yes, deactivate"
                  question="They will be signed out and lose access. Continue?"
                  danger
                  icon={<Icon name="lock" />}
                />
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="card glass">
          <h2 className="c-title">
            <span className="ic">
              <Icon name="user" />
            </span>
            About
          </h2>
          <p className="text-ink-2">{person.bio || "No bio yet."}</p>
          <p className="muted" style={{ fontSize: 13 }}>
            The full 3D profile with publications, career and CV arrives in Phase 5.
          </p>
        </section>
      )}
    </>
  );
}
