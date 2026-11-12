import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { initials, requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLOR_VAR, safeSearch, STATUS_LABEL } from "@/lib/ui";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage(props: PageProps<"/people">) {
  return (
    <section className="view">
      <Suspense fallback={<p className="muted">Loading the directory…</p>}>
        <People searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

/** The list comes straight from the database; row-level security removes anyone you may not see. */
async function People({ searchParams }: { searchParams: PageProps<"/people">["searchParams"] }) {
  const account = await requireAccount();
  const params = await searchParams;
  const q = safeSearch(typeof params.q === "string" ? params.q : "");
  const status = typeof params.status === "string" ? params.status : "";
  const group = typeof params.group === "string" ? params.group : "";
  const admin = account.isAdmin;

  const supabase = await createClient();
  let query = supabase
    .from("people")
    .select("id, full_name, email, title, department, status, joined_year, group_members(group_id, groups(id, short_code, color, name))")
    .order("full_name");
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%,title.ilike.%${q}%`);
  if (admin && ["active", "invited", "deactivated"].includes(status)) query = query.eq("status", status as "active");
  const [{ data, error }, { data: groups }] = await Promise.all([query, supabase.from("groups").select("id, name, short_code").order("name")]);

  const people = (data ?? []).filter((p) => !group || p.group_members.some((m) => m.group_id === group));
  const filtered = Boolean(q || status || group);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">People directory · {people.length}{filtered ? " matching" : ""}</p>
          <h1>{admin ? "Everyone at the faculty" : "People in your groups"}</h1>
          <p className="lede">
            {admin
              ? "Only people registered here can activate an account or join a group."
              : "You can see everyone who shares a research group with you. Everyone else stays private."}
          </p>
        </div>
        {admin && (
          <div className="actions">
            <Link className="btn btn-ghost" href="/people/import">
              <Icon name="upload" />
              Import CSV
            </Link>
            <Link className="btn btn-primary" href="/people/new">
              <Icon name="plus" />
              Register person
            </Link>
          </div>
        )}
      </header>

      <form className="toolbar glass" action="/people" role="search">
        <div className="search" style={{ flex: "1 1 260px", height: 42, boxShadow: "none" }}>
          <Icon name="search" width={17} height={17} />
          <label className="sr-only" htmlFor="people-q">
            Search people
          </label>
          <input id="people-q" name="q" defaultValue={q} placeholder="Search by name, email, title or department" autoComplete="off" />
        </div>
        <label className="sr-only" htmlFor="people-group">
          Group
        </label>
        <select id="people-group" name="group" className="input select" defaultValue={group}>
          <option value="">All groups</option>
          {(groups ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.short_code} · {g.name}
            </option>
          ))}
        </select>
        {admin && (
          <>
            <label className="sr-only" htmlFor="people-status">
              Status
            </label>
            <select id="people-status" name="status" className="input select" defaultValue={status}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="invited">Not activated</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </>
        )}
        <button className="btn" type="submit">
          Apply
        </button>
        {filtered && (
          <Link className="btn btn-ghost" href="/people">
            Clear
          </Link>
        )}
      </form>

      {error && <div className="empty glass">We could not load the directory. Refresh the page to try again.</div>}

      {!error && people.length === 0 && (
        <div className="empty glass">
          <Icon name="users" width={22} height={22} />
          <span>{filtered ? "No one matches these filters." : admin ? "The directory is empty. Register someone or import a CSV." : "No one to show yet."}</span>
        </div>
      )}

      {!admin && people.length > 0 && (
        <div className="hint">
          <Icon name="lock" />
          <span>
            You can see {Math.max(0, people.length - 1)} {people.length === 2 ? "colleague" : "colleagues"} who share a research group with you.
          </span>
        </div>
      )}

      {admin && people.length > 0 ? (
        <div className="table-wrap glass">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Department</th>
                <th>Groups</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/people/${p.id}`} className="who">
                      <span className="av" style={{ ["--s" as string]: "36px" }} aria-hidden="true">
                        {initials(p.full_name)}
                      </span>
                      <span>
                        <b>{p.full_name}</b>
                        <small>{p.email}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {p.department}
                    <small className="muted" style={{ display: "block" }}>
                      {p.title}
                    </small>
                  </td>
                  <td>
                    <span className="chips">
                      {p.group_members.map((m) =>
                        m.groups ? (
                          <span key={m.group_id} className="chip sm" style={{ ["--c" as string]: GROUP_COLOR_VAR[m.groups.color] }} title={m.groups.name}>
                            {m.groups.short_code}
                          </span>
                        ) : null,
                      )}
                      {p.group_members.length === 0 && <span className="muted">None</span>}
                    </span>
                  </td>
                  <td>
                    <span className="chip sm" style={{ ["--c" as string]: STATUS_LABEL[p.status].color }}>
                      {STATUS_LABEL[p.status].label}
                    </span>
                  </td>
                  <td className="mono">{p.joined_year ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="people-list">
          {people.map((p) => (
            <li key={p.id} className="glass">
              <span className="av" style={{ ["--s" as string]: "44px" }} aria-hidden="true">
                {initials(p.full_name)}
              </span>
              <span style={{ minWidth: 0 }}>
                <b>{p.full_name}</b>
                <small>
                  {p.title} · {p.department}
                </small>
                <span className="chips">
                  {p.group_members.map((m) =>
                    m.groups ? (
                      <span key={m.group_id} className="chip sm" style={{ ["--c" as string]: GROUP_COLOR_VAR[m.groups.color] }}>
                        {m.groups.short_code}
                      </span>
                    ) : null,
                  )}
                  {p.id === account.person?.id && (
                    <span className="chip sm" style={{ ["--c" as string]: "var(--mint)" }}>
                      You
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
