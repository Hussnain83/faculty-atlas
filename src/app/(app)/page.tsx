import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";

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

const TILES: { label: string; icon: IconName; c: string; note: string }[] = [
  { label: "People in directory", icon: "users", c: "var(--lagoon)", note: "Counts appear in Phase 1" },
  { label: "Research groups", icon: "layers", c: "var(--coral)", note: "Counts appear in Phase 1" },
  { label: "Publications", icon: "book", c: "var(--iris)", note: "Counts appear in Phase 1" },
  { label: "CVs uploaded", icon: "file", c: "var(--saffron)", note: "Counts appear in Phase 4" },
];

export default function OverviewPage() {
  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Faculty Atlas is taking shape</h1>
          <p className="lede">
            This is the real app, built from the approved prototype. The look and layout are in place; the data, sign-in
            and 3D pages arrive phase by phase.
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/design">
            <Icon name="palette" />
            See the design system
          </Link>
        </div>
      </header>

      <section className="kpis" aria-label="Headline numbers">
        {TILES.map((t) => (
          <div key={t.label} className="kpi glass" style={{ ["--c" as string]: t.c }}>
            <span className="k-label">
              <Icon name={t.icon} />
              {t.label}
            </span>
            <span className="k-num">–</span>
            <span className="k-sub">{t.note}</span>
          </div>
        ))}
      </section>

      <section className="card glass">
        <div className="c-head">
          <h2 className="c-title">
            <span className="ic">
              <Icon name="chart" />
            </span>
            Build plan
          </h2>
          <span className="chip" style={{ ["--c" as string]: "var(--mint)" }}>
            Phase 0 in progress
          </span>
        </div>
        <ol className="roadmap">
          {PHASES.map((p) => (
            <li key={p.n} data-state={p.n === 0 ? "now" : "next"}>
              <span className="n">{p.n}</span>
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
