"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import {
  deleteAchievement,
  deleteExperience,
  deletePublication,
  lookupDoi,
  saveAchievement,
  saveExperience,
  savePublication,
  type Result,
} from "@/app/(app)/profile/actions";
import { Status } from "@/components/profile/basics";
import { Icon } from "@/components/ui/Icon";

type Action = (prev: Result | null, form: FormData) => Promise<Result>;

/** Shared shell: list rows with Edit/Delete and one inline form for adding or editing. */
function useEditor() {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return { editing, open: (id: string | "new") => setEditing(id), close: () => setEditing(null) };
}

function FormShell({ action, onDone, submitLabel, children }: { action: Action; onDone: () => void; submitLabel: string; children: (bad: (f: string) => string) => React.ReactNode }) {
  const [result, onSubmit, pending] = useKeptForm(action, null);
  useEffect(() => {
    if (result?.ok) onDone();
  }, [result, onDone]);
  const bad = (f: string) => (result && !result.ok && result.field === f ? " bad" : "");
  return (
    <form onSubmit={onSubmit} className="form-grid entry-form" noValidate>
      {children(bad)}
      <div className="form-actions span-2">
        <Status result={result && !result.ok ? result : null} />
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? <span className="spin" /> : <Icon name="check" />}
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function DeleteButton({ run, question }: { run: () => Promise<Result>; question: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking)
    return (
      <button type="button" className="icon-btn" aria-label="Delete" title="Delete" onClick={() => setAsking(true)}>
        <Icon name="x" />
      </button>
    );
  return (
    <span className="confirm">
      <span>{question}</span>
      <button type="button" className="btn btn-sm btn-danger-solid" disabled={pending} onClick={() => start(async () => void (await run()))}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

/* ---------------------------------------------------------------- career */
type Experience = { id: string; role: string; organization: string; start_year: number; end_year: number | null; is_education: boolean; description: string | null };

export function CareerEditor({ personId, entries }: { personId: string | null; entries: Experience[] }) {
  const ed = useEditor();
  const sorted = [...entries].sort((a, b) => (b.end_year ?? 9999) - (a.end_year ?? 9999) || b.start_year - a.start_year);
  const form = (e?: Experience) => (
    <FormShell key={e?.id ?? "new"} action={saveExperience.bind(null, personId, e?.id ?? null)} onDone={ed.close} submitLabel={e ? "Save" : "Add entry"}>
      {(bad) => <ExperienceFields e={e} bad={bad} />}
    </FormShell>
  );
  return (
    <div className="entries">
      {sorted.length === 0 && ed.editing !== "new" && <p className="muted">No roles or degrees yet.</p>}
      <ul className="entry-list">
        {sorted.map((e) =>
          ed.editing === e.id ? (
            <li key={e.id}>{form(e)}</li>
          ) : (
            <li key={e.id} className="entry">
              <span className="entry-ic">
                <Icon name={e.is_education ? "cap" : "brief"} />
              </span>
              <span style={{ minWidth: 0 }}>
                <b>
                  {e.role}
                  {!e.end_year && (
                    <span className="chip sm" style={{ ["--c" as string]: "var(--mint)", marginLeft: 8 }}>
                      Current
                    </span>
                  )}
                </b>
                <small>
                  {e.organization} · <span className="mono">{e.start_year} – {e.end_year ?? "now"}</span>
                </small>
              </span>
              <span className="row-actions">
                <button type="button" className="btn btn-sm" onClick={() => ed.open(e.id)}>
                  <Icon name="edit" />
                  Edit
                </button>
                <DeleteButton run={() => deleteExperience(personId, e.id)} question="Delete this entry?" />
              </span>
            </li>
          ),
        )}
      </ul>
      {ed.editing === "new" ? (
        form()
      ) : (
        <button type="button" className="btn" onClick={() => ed.open("new")}>
          <Icon name="plus" />
          Add role or degree
        </button>
      )}
    </div>
  );
}

function ExperienceFields({ e, bad }: { e?: Experience; bad: (f: string) => string }) {
  const [current, setCurrent] = useState(e ? e.end_year === null : false);
  return (
    <>
      <div className={`form-field span-2${bad("role")}`}>
        <label htmlFor="ex-role">Role or degree</label>
        <input id="ex-role" name="role" className="input" defaultValue={e?.role} placeholder="Associate Professor, or PhD Computer Science" />
      </div>
      <div className="form-field span-2">
        <label htmlFor="ex-org">Organisation</label>
        <input id="ex-org" name="organization" className="input" defaultValue={e?.organization} placeholder="Northfield University · Computer Science" />
      </div>
      <div className={`form-field${bad("start_year")}`}>
        <label htmlFor="ex-start">Start year</label>
        <input id="ex-start" name="start_year" type="number" className="input" defaultValue={e?.start_year ?? ""} placeholder="2021" />
      </div>
      <div className={`form-field${bad("end_year")}`}>
        <label htmlFor="ex-end">End year</label>
        <input id="ex-end" name="end_year" type="number" className="input" defaultValue={e?.end_year ?? ""} placeholder="2024" disabled={current} />
      </div>
      <div className="form-field span-2 inline-checks">
        <label className="check-line">
          <input type="checkbox" name="current" checked={current} onChange={(ev) => setCurrent(ev.target.checked)} /> I still work or study here
        </label>
        <label className="check-line">
          <input type="checkbox" name="is_education" defaultChecked={e?.is_education} /> This is education (a degree)
        </label>
      </div>
      <div className={`form-field span-2${bad("description")}`}>
        <label htmlFor="ex-desc">What you did (optional)</label>
        <textarea id="ex-desc" name="description" className="input textarea" maxLength={600} defaultValue={e?.description ?? ""} placeholder="Courses taught, teams led, thesis topic…" />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- achievements */
type Achievement = { id: string; kind: "award" | "grant" | "certificate"; title: string; organization: string; year: number };
const KIND = { award: { label: "Award", icon: "award", c: "var(--saffron)" }, grant: { label: "Grant", icon: "star", c: "var(--mint)" }, certificate: { label: "Certificate", icon: "shield", c: "var(--iris)" } } as const;

export function AchievementEditor({ personId, entries }: { personId: string | null; entries: Achievement[] }) {
  const ed = useEditor();
  const sorted = [...entries].sort((a, b) => b.year - a.year);
  const form = (a?: Achievement) => (
    <FormShell key={a?.id ?? "new"} action={saveAchievement.bind(null, personId, a?.id ?? null)} onDone={ed.close} submitLabel={a ? "Save" : "Add achievement"}>
      {(bad) => (
        <>
          <div className={`form-field span-2${bad("title")}`}>
            <label htmlFor="ac-title">Title</label>
            <input id="ac-title" name="title" className="input" defaultValue={a?.title} placeholder="Best Paper Award, ACL Findings" />
          </div>
          <div className="form-field span-2">
            <label htmlFor="ac-org">Awarded by</label>
            <input id="ac-org" name="organization" className="input" defaultValue={a?.organization} placeholder="Association for Computational Linguistics" />
          </div>
          <div className="form-field">
            <label htmlFor="ac-kind">Type</label>
            <select id="ac-kind" name="kind" className="input" defaultValue={a?.kind ?? "award"}>
              <option value="award">Award</option>
              <option value="grant">Grant</option>
              <option value="certificate">Certificate</option>
            </select>
          </div>
          <div className={`form-field${bad("year")}`}>
            <label htmlFor="ac-year">Year</label>
            <input id="ac-year" name="year" type="number" className="input" defaultValue={a?.year ?? new Date().getFullYear()} />
          </div>
        </>
      )}
    </FormShell>
  );
  return (
    <div className="entries">
      {sorted.length === 0 && ed.editing !== "new" && <p className="muted">No awards, grants or certificates yet.</p>}
      <ul className="entry-list">
        {sorted.map((a) =>
          ed.editing === a.id ? (
            <li key={a.id}>{form(a)}</li>
          ) : (
            <li key={a.id} className="entry">
              <span className="entry-ic" style={{ ["--c" as string]: KIND[a.kind].c }}>
                <Icon name={KIND[a.kind].icon} />
              </span>
              <span style={{ minWidth: 0 }}>
                <b>{a.title}</b>
                <small>
                  {KIND[a.kind].label} · {a.organization ? `${a.organization} · ` : ""}
                  <span className="mono">{a.year}</span>
                </small>
              </span>
              <span className="row-actions">
                <button type="button" className="btn btn-sm" onClick={() => ed.open(a.id)}>
                  <Icon name="edit" />
                  Edit
                </button>
                <DeleteButton run={() => deleteAchievement(personId, a.id)} question="Delete this achievement?" />
              </span>
            </li>
          ),
        )}
      </ul>
      {ed.editing === "new" ? (
        form()
      ) : (
        <button type="button" className="btn" onClick={() => ed.open("new")}>
          <Icon name="plus" />
          Add achievement
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- publications */
export type Publication = {
  id: string;
  title: string;
  venue: string;
  kind: "journal" | "conference";
  year: number;
  doi: string | null;
  citations: number;
  external_authors: string[];
  created_by: string | null;
  coauthorIds: string[];
  authorNames: string[];
};
type Colleague = { id: string; full_name: string };

export function PublicationEditor({ personId, ownId, pubs, colleagues }: { personId: string | null; ownId: string; pubs: Publication[]; colleagues: Colleague[] }) {
  const ed = useEditor();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...pubs].sort((a, b) => b.year - a.year || b.citations - a.citations).filter((p) => !s || `${p.title} ${p.venue} ${p.year}`.toLowerCase().includes(s));
  }, [pubs, q]);

  const form = (p?: Publication) => (
    <FormShell key={p?.id ?? "new"} action={savePublication.bind(null, personId, p?.id ?? null)} onDone={ed.close} submitLabel={p ? "Save" : "Add paper"}>
      {(bad) => <PublicationFields p={p} bad={bad} colleagues={colleagues} canEditAuthors={!p || p.created_by === ownId} />}
    </FormShell>
  );

  return (
    <div className="entries">
      <div className="toolbar" style={{ padding: 0 }}>
        {pubs.length > 4 && (
          <div className="search" style={{ flex: "1 1 220px", height: 40, boxShadow: "none" }}>
            <Icon name="search" width={16} height={16} />
            <label className="sr-only" htmlFor="pub-q">
              Search your papers
            </label>
            <input id="pub-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search your ${pubs.length} papers`} />
          </div>
        )}
        {ed.editing !== "new" && (
          <button type="button" className="btn btn-primary" onClick={() => ed.open("new")}>
            <Icon name="plus" />
            Add paper
          </button>
        )}
      </div>
      {ed.editing === "new" && form()}
      {pubs.length === 0 && ed.editing !== "new" && <p className="muted">No papers yet. Add one, or paste a DOI to fill it in automatically.</p>}
      <ul className="entry-list">
        {shown.map((p) =>
          ed.editing === p.id ? (
            <li key={p.id}>{form(p)}</li>
          ) : (
            <li key={p.id} className="entry">
              <span className="entry-year mono">{p.year}</span>
              <span style={{ minWidth: 0 }}>
                <b>{p.title}</b>
                <small>
                  <span className="chip sm" style={{ ["--c" as string]: p.kind === "journal" ? "var(--iris)" : "var(--lagoon)", marginRight: 6 }}>
                    {p.kind === "journal" ? "Journal" : "Conference"}
                  </span>
                  {p.venue} · {p.citations} citations
                </small>
                <small>{p.authorNames.join(", ")}</small>
              </span>
              <span className="row-actions">
                <button type="button" className="btn btn-sm" onClick={() => ed.open(p.id)}>
                  <Icon name="edit" />
                  Edit
                </button>
                <DeleteButton
                  run={() => deletePublication(personId, p.id)}
                  question={p.created_by === ownId ? "Delete this paper for all its authors?" : "Remove yourself as an author?"}
                />
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function PublicationFields({ p, bad, colleagues, canEditAuthors }: { p?: Publication; bad: (f: string) => string; colleagues: Colleague[]; canEditAuthors: boolean }) {
  const [title, setTitle] = useState(p?.title ?? "");
  const [venue, setVenue] = useState(p?.venue ?? "");
  const [year, setYear] = useState(p?.year ? String(p.year) : "");
  const [kind, setKind] = useState<"journal" | "conference">(p?.kind ?? "journal");
  const [doi, setDoi] = useState(p?.doi ?? "");
  const [citations, setCitations] = useState(String(p?.citations ?? 0));
  const [external, setExternal] = useState((p?.external_authors ?? []).join(", "));
  const [picked, setPicked] = useState<Set<string>>(new Set(p?.coauthorIds ?? []));
  const [lookup, setLookup] = useState<string | null>(null);
  const [looking, start] = useTransition();

  const fill = () =>
    start(async () => {
      const r = await lookupDoi(doi);
      if (!r.ok) return setLookup(r.error);
      setTitle(r.title);
      setVenue(r.venue);
      if (r.year) setYear(String(r.year));
      setKind(r.kind);
      setCitations(String(r.citations));
      const known = new Set(colleagues.map((c) => c.full_name.replace(/^(Dr\.|Prof\.)\s+/, "").split(" ").slice(-1)[0].toLowerCase()));
      setExternal(r.authors.filter((a) => !known.has(a.split(" ").slice(-1)[0].toLowerCase())).join(", "));
      setLookup(`Filled from Crossref. Check the details, then tick any co-authors from Northfield below.`);
    });

  return (
    <>
      <div className={`form-field span-2${bad("doi")}`}>
        <label htmlFor="pb-doi">DOI (optional)</label>
        <div className="actions" style={{ flexWrap: "nowrap" }}>
          <input id="pb-doi" name="doi" className="input mono" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1109/TPAMI.2024.1234" />
          <button type="button" className="btn" onClick={fill} disabled={looking || !doi.trim()}>
            {looking ? <span className="spin dark" /> : <Icon name="search" />}
            Fill from DOI
          </button>
        </div>
        {lookup && <p className="muted" style={{ fontSize: 12.5 }}>{lookup}</p>}
      </div>
      <div className={`form-field span-2${bad("title")}`}>
        <label htmlFor="pb-title">Title</label>
        <input id="pb-title" name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-field span-2">
        <label htmlFor="pb-venue">Journal or conference</label>
        <input id="pb-venue" name="venue" className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="IEEE Transactions on Neural Networks and Learning Systems" />
      </div>
      <div className="form-field">
        <label htmlFor="pb-kind">Type</label>
        <select id="pb-kind" name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "journal" | "conference")}>
          <option value="journal">Journal article</option>
          <option value="conference">Conference paper</option>
        </select>
      </div>
      <div className={`form-field${bad("year")}`}>
        <label htmlFor="pb-year">Year</label>
        <input id="pb-year" name="year" type="number" className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
      </div>
      <div className={`form-field${bad("citations")}`}>
        <label htmlFor="pb-cites">Citations</label>
        <input id="pb-cites" name="citations" type="number" min={0} className="input" value={citations} onChange={(e) => setCitations(e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="pb-ext">Co-authors outside Northfield</label>
        <input id="pb-ext" name="external_authors" className="input" value={external} onChange={(e) => setExternal(e.target.value)} placeholder="S. Ahmed, J. Park" />
      </div>
      {canEditAuthors ? (
        colleagues.length > 0 && (
          <fieldset className="form-field span-2">
            <legend>Co-authors at Northfield (people in your groups)</legend>
            <div className="check-chips">
              {colleagues.map((c) => (
                <label key={c.id} className="check-chip">
                  <input
                    type="checkbox"
                    name="coauthors"
                    value={c.id}
                    checked={picked.has(c.id)}
                    onChange={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  />
                  <span>{c.full_name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      ) : (
        <p className="muted span-2" style={{ fontSize: 12.5 }}>
          Only the person who added this paper can change its Northfield co-authors.
        </p>
      )}
    </>
  );
}
