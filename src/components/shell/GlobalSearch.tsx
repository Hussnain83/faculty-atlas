"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { quickSearch } from "@/app/(app)/search/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { SearchResults } from "@/lib/search";
import { GROUP_COLOR_VAR } from "@/lib/ui";

/** Wraps the matching part of a label in <mark>. */
export function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

type Item = { href: string; key: string };

/** The search box in the top bar: live suggestions as you type, Enter for the full results page, "/" to focus. */
export function GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  // "/" focuses the search from anywhere, as in the prototype.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? "")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await quickSearch(term);
        if (id === seq.current) {
          setRes(r);
          setActive(-1);
        }
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const shown = term.length >= 2 ? res : null;
  const items: Item[] = shown
    ? [
        ...shown.people.map((p) => ({ href: `/people/${p.id}`, key: `p${p.id}` })),
        ...shown.groups.map((g) => ({ href: `/groups/${g.slug}`, key: `g${g.slug}` })),
        ...shown.skills.map((s) => ({ href: `/search?q=${encodeURIComponent(s.skill)}`, key: `s${s.skill}` })),
        ...shown.papers.map((p) => ({ href: p.authorId ? `/people/${p.authorId}` : `/search?q=${encodeURIComponent(p.title)}`, key: `x${p.id}` })),
      ]
    : [];
  const idx = (key: string) => items.findIndex((i) => i.key === key);
  const go = (href: string) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault();
      go(items[active].href);
    }
  };

  const opt = (key: string) => ({ id: `${listId}-${key}`, role: "option" as const, "aria-selected": idx(key) === active, onMouseEnter: () => setActive(idx(key)) });
  const total = shown ? shown.people.length + shown.groups.length + shown.skills.length + shown.papers.length : 0;

  return (
    <div className="gsearch" ref={boxRef}>
      <form
        className="search"
        role="search"
        action="/search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) go(`/search?q=${encodeURIComponent(term)}`);
        }}
      >
        <Icon name="search" width={18} height={18} />
        <label className="sr-only" htmlFor="global-search">
          Search people, skills, groups or papers
        </label>
        <input
          ref={inputRef}
          id="global-search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search people, skills or groups"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && term.length >= 2}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && items[active] ? `${listId}-${items[active].key}` : undefined}
        />
        <kbd>{pending ? "…" : "/"}</kbd>
      </form>

      {open && term.length >= 2 && (
        <div className="gs-pop glass" id={listId} role="listbox" aria-label="Search suggestions">
          {!shown ? (
            <p className="gs-empty">Searching…</p>
          ) : total === 0 ? (
            <p className="gs-empty">No matches for “{term}” among the people and groups you can see.</p>
          ) : (
            <>
              {shown.people.length > 0 && <h3>People</h3>}
              {shown.people.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`} className="gs-item" onClick={() => setOpen(false)} {...opt(`p${p.id}`)}>
                  <Avatar name={p.name} src={p.photoUrl} size={34} />
                  <span>
                    <b>
                      <Highlight text={p.name} q={term} />
                    </b>
                    <small>{p.matchedSkill ? <>Skill: <Highlight text={p.matchedSkill} q={term} /></> : [p.title, p.department].filter(Boolean).join(" · ")}</small>
                  </span>
                </Link>
              ))}
              {shown.groups.length > 0 && <h3>Groups</h3>}
              {shown.groups.map((g) => (
                <Link key={g.slug} href={`/groups/${g.slug}`} className="gs-item" onClick={() => setOpen(false)} {...opt(`g${g.slug}`)}>
                  <span className="g-badge" style={{ ["--c" as string]: GROUP_COLOR_VAR[g.color] }}>
                    {g.shortCode}
                  </span>
                  <span>
                    <b>
                      <Highlight text={g.name} q={term} />
                    </b>
                    <small>{g.open ? "Your group" : "Members only"}</small>
                  </span>
                </Link>
              ))}
              {shown.skills.length > 0 && <h3>Skills</h3>}
              {shown.skills.map((s) => (
                <Link key={s.skill} href={`/search?q=${encodeURIComponent(s.skill)}`} className="gs-item" onClick={() => setOpen(false)} {...opt(`s${s.skill}`)}>
                  <span className="gs-ic" style={{ ["--c" as string]: "var(--lagoon)" }}>
                    <Icon name="spark" />
                  </span>
                  <span>
                    <b>
                      <Highlight text={s.skill} q={term} />
                    </b>
                    <small>
                      {s.people.length} {s.people.length === 1 ? "person" : "people"}
                    </small>
                  </span>
                </Link>
              ))}
              {shown.papers.length > 0 && <h3>Papers</h3>}
              {shown.papers.map((p) => (
                <Link key={p.id} href={p.authorId ? `/people/${p.authorId}` : `/search?q=${encodeURIComponent(p.title)}`} className="gs-item" onClick={() => setOpen(false)} {...opt(`x${p.id}`)}>
                  <span className="gs-ic" style={{ ["--c" as string]: "var(--iris)" }}>
                    <Icon name="book" />
                  </span>
                  <span>
                    <b>
                      <Highlight text={p.title} q={term} />
                    </b>
                    <small>
                      {p.venue} · {p.year}
                    </small>
                  </span>
                </Link>
              ))}
            </>
          )}
          <div className="gs-foot">
            <span>↑ ↓ to move · Enter to open</span>
            <Link href={`/search?q=${encodeURIComponent(term)}`} onClick={() => setOpen(false)}>
              All results
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
