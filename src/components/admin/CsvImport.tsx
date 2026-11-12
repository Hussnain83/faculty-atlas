"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importPeople, type ImportResult, type ImportRow } from "@/app/(app)/people/actions";
import { Icon } from "@/components/ui/Icon";
import { CSV_HEADERS, parseCsv, validatePerson, type PersonInput } from "@/lib/validation";

const TEMPLATE =
  "full_name,email,title,department,office,phone_ext,joined_year,groups\n" +
  "Dr. Sara Malik,s.malik@northfield.edu,Assistant Professor,Computer Science,Block C · Room 210,Ext. 4410,2024,AI\n" +
  "Bilal Ahmed,b.ahmed@northfield.edu,Lecturer,Mathematics,,,2025,DS;LS\n";

type Parsed = { rows: (ImportRow & { _problem?: string })[]; unknownHeaders: string[]; missing: string[] };

function parse(text: string, existing: Set<string>): Parsed {
  const table = parseCsv(text.replace(/^﻿/, ""));
  if (table.length === 0) return { rows: [], unknownHeaders: [], missing: ["full_name", "email"] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const map = header.map((h) => CSV_HEADERS[h]);
  const unknownHeaders = header.filter((h, i) => h && !map[i]);
  const missing = (["full_name", "email"] as const).filter((k) => !map.includes(k));
  const seen = new Set<string>();
  const rows = table.slice(1).map((cells) => {
    const row: ImportRow = {};
    map.forEach((key, i) => {
      if (key) (row as Record<string, string>)[key] = (cells[i] ?? "").trim();
    });
    const { value, errors } = validatePerson(row as Partial<PersonInput>);
    let problem = Object.values(errors)[0];
    if (!problem && existing.has(value.email)) problem = "Already in the directory";
    if (!problem && seen.has(value.email)) problem = "Listed twice in this file";
    seen.add(value.email);
    return { ...row, _problem: problem };
  });
  return { rows, unknownHeaders, missing };
}

export function CsvImport({ existingEmails, groupCodes }: { existingEmails: string[]; groupCodes: string[] }) {
  const existing = useMemo(() => new Set(existingEmails.map((e) => e.toLowerCase())), [existingEmails]);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();

  const load = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) {
      setParsed({ rows: [], unknownHeaders: [], missing: [] });
      setResult({ ok: false, error: "The file is larger than 2 MB. Split it into smaller files." });
      return;
    }
    setParsed(parse(await file.text(), existing));
  };

  const good = parsed?.rows.filter((r) => !r._problem) ?? [];
  const bad = parsed?.rows.filter((r) => r._problem) ?? [];

  const runImport = () =>
    start(async () => {
      const rows = good.map((r) => {
        const copy = { ...r };
        delete copy._problem;
        return copy;
      });
      setResult(await importPeople(rows));
    });

  if (result?.ok) {
    return (
      <div className="card glass">
        <h2 className="c-title">
          <span className="ic" style={{ ["--c" as string]: "var(--mint)" }}>
            <Icon name="check" />
          </span>
          {result.created} {result.created === 1 ? "person" : "people"} added to the directory
        </h2>
        <p className="text-ink-2">Each of them can now activate their account from Create account on the sign-in page.</p>
        {result.skipped.length > 0 && (
          <div className="hint">
            <Icon name="info" />
            <span>
              {result.skipped.length} {result.skipped.length === 1 ? "row was" : "rows were"} skipped:{" "}
              {result.skipped.map((s) => `row ${s.row} (${s.email || "no email"}: ${s.reason})`).join("; ")}
            </span>
          </div>
        )}
        <div className="actions">
          <Link className="btn btn-primary" href="/people">
            <Icon name="users" />
            View the directory
          </Link>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setParsed(null);
              setResult(null);
              setFileName("");
            }}
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bento">
      <section className="card glass s8">
        <label
          className={`drop${over ? " over" : ""}`}
          htmlFor="csv-file"
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            load(e.dataTransfer.files[0]);
          }}
        >
          <span className="big">
            <Icon name="upload" />
          </span>
          <b>{fileName || "Drop a CSV file here or browse"}</b>
          <small>Excel and Google Sheets can both save as CSV. Up to 1,000 people per file.</small>
          <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => load(e.target.files?.[0])} />
        </label>

        {result && !result.ok && <p className="field-err">{result.error}</p>}

        {parsed && parsed.missing.length > 0 && (
          <p className="field-err">The file needs a {parsed.missing.join(" and ")} column. Check the first row of the file.</p>
        )}

        {parsed && parsed.missing.length === 0 && parsed.rows.length > 0 && (
          <>
            <div className="c-head">
              <p className="text-ink-2">
                <b className="text-ink">{good.length}</b> ready to import
                {bad.length > 0 && (
                  <>
                    {" · "}
                    <b style={{ color: "var(--coral)" }}>{bad.length}</b> will be skipped
                  </>
                )}
              </p>
              <button className="btn btn-primary" type="button" disabled={pending || good.length === 0} onClick={runImport}>
                {pending ? <span className="spin dark" /> : <Icon name="upload" />}
                {pending ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "person" : "people"}`}
              </button>
            </div>
            {parsed.unknownHeaders.length > 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Ignored columns: {parsed.unknownHeaders.join(", ")}
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Title · Department</th>
                    <th>Groups</th>
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r, i) => (
                    <tr key={i} className={r._problem ? "row-bad" : ""}>
                      <td className="mono">{i + 2}</td>
                      <td>{r.full_name}</td>
                      <td>{r.email}</td>
                      <td>{[r.title, r.department].filter(Boolean).join(" · ")}</td>
                      <td>{r.groups}</td>
                      <td>
                        {r._problem ? (
                          <span className="chip sm" style={{ ["--c" as string]: "var(--coral)" }}>
                            {r._problem}
                          </span>
                        ) : (
                          <span className="chip sm" style={{ ["--c" as string]: "var(--mint)" }}>
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card glass s4">
        <h2 className="c-title">
          <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
            <Icon name="file" />
          </span>
          File format
        </h2>
        <p className="text-ink-2" style={{ fontSize: 14 }}>
          The first row must name the columns. <b>full_name</b> and <b>email</b> are required. Optional: title, department,
          office, phone_ext, joined_year, groups.
        </p>
        <p className="text-ink-2" style={{ fontSize: 14 }}>
          In <b>groups</b>, list group codes separated by semicolons
          {groupCodes.length ? (
            <>
              , for example <span className="mono">{groupCodes.slice(0, 2).join(";")}</span>. Current codes: {groupCodes.join(", ")}.
            </>
          ) : (
            "."
          )}
        </p>
        <a className="btn btn-sm" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="faculty-atlas-template.csv">
          <Icon name="download" />
          Download template
        </a>
      </section>
    </div>
  );
}
