import { Suspense } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { displayName, requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PHASES: { n: number; title: string; text: string }[] = [
  { n: 0, title: "Foundations", text: "Design system, app shell, database connection, live link" },
  { n: 1, title: "Database & privacy", text: "Tables, group-only visibility rules, sample data" },
  { n: 2, title: "Sign-in & accounts", text: "3D sign-in, activation by email code, password reset" },
  { n: 3, title: "Admin tools", text: "Directory, CSV import, groups and members" },
  { n: 4, title: "Profile editing", text: "Photo, CV, bio, skills, career, publications" },
  { n: 5, title: "Profile page", text: "3D ID card, charts, skill sphere, career journey" },
  { n: 6, title: "Group page", text: "3D collaboration map, showcase, members" },
  { n: 7, title: "Overview & search", text: "Orbiting groups, leaderboard, activity, search" },
  { n: 8, title: "Quality pass", text: "Mobile, accessibility, speed, tests, security" },
  { n: 9, title: "Launch", text: "Production data, email, domain, handover" },
];
const CURRENT_PHASE = 2;

export default function OverviewPage() {
  return (
    <section className="view">
      <Suspense fallback={<Greeting name="" />}>
        <GreetingForUser />
      </Suspense>

      <Suspense fallback={<Tiles values={null} admin />}>
        <LiveTiles />
      </Suspense>

      <section className="card glass">
        <div className="c-head">
          <h2 className="c-title">
            <span className="ic">
              <Icon name="chart" />
            </span>
            Build plan
          </h2>
          <span className="chip" style={{ ["--c" as string]: "var(--mint)" }}>
            Phase {CURRENT_PHASE} in progress
          </span>
        </div>
        <ol className="roadmap">
          {PHASES.map((p) => (
            <li key={p.n} data-state={p.n === CURRENT_PHASE ? "now" : "next"}>
              <span className="n">{p.n < CURRENT_PHASE ? <Icon name="check" width={14} height={14} /> : p.n}</span>
              <span>
                <b>{p.title}</b>
                {p.text}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

async function GreetingForUser() {
  const account = await requireAccount();
  const name = displayName(account).replace(/^(Dr\.|Prof\.)\s+/, "").split(" ")[0];
  return <Greeting name={name} admin={account.isAdmin} />;
}

function Greeting({ name, admin }: { name: string; admin?: boolean }) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>{name ? `Good to see you, ${name}` : "Welcome"}</h1>
        <p className="lede">
          {admin
            ? "You can see everyone in the directory. Admin tools for people and groups arrive in Phase 3."
            : "You see the people who share a research group with you. Full profiles arrive in Phase 5."}
        </p>
      </div>
    </header>
  );
}

/** Real counts from the database. Row-level security decides what each person is allowed to count. */
async function LiveTiles() {
  const account = await requireAccount();
  const supabase = await createClient();
  const count = async (table: "people" | "groups" | "publications" | "cvs") => {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [people, groups, papers, cvs] = await Promise.all([count("people"), count("groups"), count("publications"), count("cvs")]);
  return <Tiles values={{ people, groups, papers, cvs }} admin={account.isAdmin} />;
}

function Tiles({ values, admin }: { values: { people: number; groups: number; papers: number; cvs: number } | null; admin: boolean }) {
  const tiles: { label: string; icon: IconName; c: string; value?: number; note: string }[] = [
    { label: admin ? "People in directory" : "People you can see", icon: "users", c: "var(--lagoon)", value: values?.people, note: admin ? "Everyone registered" : "You plus your group colleagues" },
    { label: "Research groups", icon: "layers", c: "var(--coral)", value: values?.groups, note: "Names are visible to everyone" },
    { label: "Publications", icon: "book", c: "var(--iris)", value: values?.papers, note: admin ? "Across the faculty" : "By people you can see" },
    { label: "CVs uploaded", icon: "file", c: "var(--saffron)", value: values?.cvs, note: "CV upload arrives in Phase 4" },
  ];
  return (
    <section className="kpis" aria-label="Headline numbers">
      {tiles.map((t) => (
        <div key={t.label} className="kpi glass" style={{ ["--c" as string]: t.c }}>
          <span className="k-label">
            <Icon name={t.icon} />
            {t.label}
          </span>
          <span className="k-num">{t.value ?? "–"}</span>
          <span className="k-sub">{t.note}</span>
        </div>
      ))}
    </section>
  );
}
