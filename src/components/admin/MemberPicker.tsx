"use client";

import { useMemo, useState, useTransition } from "react";
import { addMembers } from "@/app/(app)/groups/actions";
import { Icon } from "@/components/ui/Icon";

type Candidate = { id: string; full_name: string; title: string; department: string; status: string };

const initials = (name: string) => {
  const parts = name.replace(/^(Dr\.|Prof\.)\s+/, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/** Search the directory and add people to the group. Only registered people appear here. */
export function MemberPicker({ groupId, candidates }: { groupId: string; candidates: Candidate[] }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return candidates.filter((c) => !s || `${c.full_name} ${c.title} ${c.department}`.toLowerCase().includes(s)).slice(0, 60);
  }, [q, candidates]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = () =>
    start(async () => {
      const r = await addMembers(groupId, [...picked]);
      setMessage(r.ok ? { ok: true, text: `${r.added} ${r.added === 1 ? "person" : "people"} added.` } : { ok: false, text: r.error ?? "Something went wrong." });
      if (r.ok) setPicked(new Set());
    });

  return (
    <div className="picker">
      <div className="search" style={{ height: 42, boxShadow: "none" }}>
        <Icon name="search" width={17} height={17} />
        <label className="sr-only" htmlFor="mp-q">
          Search the directory
        </label>
        <input id="mp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the directory by name, title or department" autoComplete="off" />
      </div>
      {candidates.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>
          Everyone in the directory is already a member. Register new people from the People page first.
        </p>
      ) : list.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>
          No one called “{q}” is in the directory. Register them from the People page first, then add them here.
        </p>
      ) : (
        <ul className="pick-list">
          {list.map((c) => (
            <li key={c.id}>
              <label>
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="av" style={{ ["--s" as string]: "34px" }} aria-hidden="true">
                  {initials(c.full_name)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.full_name}</b>
                  <small>
                    {[c.title, c.department].filter(Boolean).join(" · ")}
                    {c.status === "invited" ? " · not activated yet" : ""}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="form-actions">
        {message && (
          <p className={message.ok ? "saved" : "field-err"} role="status">
            {message.ok && <Icon name="check" width={15} height={15} />}
            {message.text}
          </p>
        )}
        <button className="btn btn-primary" type="button" disabled={pending || picked.size === 0} onClick={add}>
          {pending ? <span className="spin dark" /> : <Icon name="plus" />}
          {picked.size ? `Add ${picked.size} to group` : "Add to group"}
        </button>
      </div>
    </div>
  );
}
