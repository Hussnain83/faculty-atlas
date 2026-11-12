"use client";

import { useState, useTransition } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { addSkill, removeCv, removePhoto, removeSkill, saveAbout, uploadCv, uploadPhoto, type Result } from "@/app/(app)/profile/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { countPdfPages, cropPhoto, formatBytes } from "@/lib/image";

export function Status({ result }: { result: Result | null }) {
  if (!result) return null;
  return result.ok ? (
    result.message ? (
      <p className="saved" role="status">
        <Icon name="check" width={15} height={15} />
        {result.message}
      </p>
    ) : null
  ) : (
    <p className="field-err" role="alert">
      {result.error}
    </p>
  );
}

/* ---------------------------------------------------------------- photo */
export function PhotoCard({ personId, name, photoUrl }: { personId: string | null; name: string; photoUrl: string | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const [over, setOver] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return setResult({ ok: false, error: "Choose an image file, such as a JPG or PNG." });
    start(async () => {
      try {
        const blob = await cropPhoto(file);
        const form = new FormData();
        form.set("photo", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        setResult(await uploadPhoto(personId, form));
      } catch {
        setResult({ ok: false, error: "That image could not be read. Try a JPG or PNG." });
      }
    });
  };

  return (
    <div className="photo-edit">
      <label
        className={`photo-drop${over ? " over" : ""}`}
        htmlFor="photo-file"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <Avatar name={name} src={photoUrl} size={112} />
        <span className="photo-cam">{pending ? <span className="spin" /> : <Icon name="upload" />}</span>
        <input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={pending} />
      </label>
      <div className="photo-text">
        <b>Profile photo</b>
        <small>Click or drop an image. It is cropped to a square and shown to people in your groups.</small>
        <div className="actions">
          <label className="btn btn-sm" htmlFor="photo-file">
            <Icon name="upload" />
            {photoUrl ? "Change photo" : "Upload photo"}
          </label>
          {photoUrl && (
            <button className="btn btn-sm btn-ghost" type="button" disabled={pending} onClick={() => start(async () => setResult(await removePhoto(personId)))}>
              Remove
            </button>
          )}
        </div>
        <Status result={result} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- CV */
export function CvCard({
  personId,
  cv,
  cvUrl,
}: {
  personId: string | null;
  cv: { file_name: string; size_bytes: number; pages: number | null; uploaded_at: string } | null;
  cvUrl: string | null;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const [over, setOver] = useState(false);
  const [asking, setAsking] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setResult({ ok: false, error: "The CV must be a PDF." });
    if (file.size > 10 * 1024 * 1024) return setResult({ ok: false, error: "The CV must be under 10 MB." });
    start(async () => {
      const form = new FormData();
      form.set("cv", file);
      const pages = await countPdfPages(file);
      if (pages) form.set("pages", String(pages));
      setResult(await uploadCv(personId, form));
    });
  };

  return (
    <div className="cv-edit">
      {cv && (
        <div className="cv-file">
          <span className="cv-icon">
            <Icon name="file" />
            <em>PDF</em>
          </span>
          <span style={{ minWidth: 0 }}>
            <b>{cv.file_name}</b>
            <small className="mono">
              {formatBytes(cv.size_bytes)}
              {cv.pages ? ` · ${cv.pages} ${cv.pages === 1 ? "page" : "pages"}` : ""} · uploaded{" "}
              {new Date(cv.uploaded_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </small>
          </span>
          <span className="actions">
            {cvUrl && (
              <a className="btn btn-sm" href={cvUrl} target="_blank" rel="noreferrer">
                <Icon name="eye" />
                Open
              </a>
            )}
            {asking ? (
              <span className="confirm">
                <span>Remove your CV?</span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger-solid"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setResult(await removeCv(personId));
                      setAsking(false);
                    })
                  }
                >
                  Remove
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(true)}>
                Remove
              </button>
            )}
          </span>
        </div>
      )}
      <label
        className={`drop${over ? " over" : ""}`}
        htmlFor="cv-file"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <span className="big">{pending ? <span className="spin dark" /> : <Icon name="upload" />}</span>
        <b>{pending ? "Uploading…" : cv ? "Drop a new PDF to replace your CV" : "Drop your CV here or browse"}</b>
        <small>PDF up to 10 MB. People in your groups can open it from your profile.</small>
        <input id="cv-file" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={pending} />
      </label>
      <Status result={result} />
    </div>
  );
}

/* ---------------------------------------------------------------- about */
type AboutPerson = { full_name: string; email: string; title: string; department: string; office: string | null; phone_ext: string | null; orcid: string | null; bio: string | null };

export function AboutForm({ personId, person }: { personId: string | null; person: AboutPerson }) {
  const [result, onSubmit, pending] = useKeptForm(saveAbout.bind(null, personId), null);
  const [bioLength, setBioLength] = useState(person.bio?.length ?? 0);
  const bad = (f: string) => (result && !result.ok && result.field === f ? " bad" : "");
  return (
    <form onSubmit={onSubmit} className="form-grid" noValidate>
      <div className={`form-field span-2${bad("full_name")}`}>
        <label htmlFor="ab-name">Full name</label>
        <input id="ab-name" name="full_name" className="input" defaultValue={person.full_name} />
      </div>
      <div className="form-field">
        <label htmlFor="ab-title">Title</label>
        <input id="ab-title" className="input" value={person.title || "Not set"} disabled />
      </div>
      <div className="form-field">
        <label htmlFor="ab-dept">Department</label>
        <input id="ab-dept" className="input" value={person.department || "Not set"} disabled />
      </div>
      <p className="muted span-2" style={{ fontSize: 12.5, marginTop: -6 }}>
        Your email, title and department are managed by the research office.
      </p>
      <div className={`form-field span-2${bad("bio")}`}>
        <label htmlFor="ab-bio">
          Bio <span className="req">{bioLength}/1200</span>
        </label>
        <textarea
          id="ab-bio"
          name="bio"
          className="input textarea"
          maxLength={1200}
          defaultValue={person.bio ?? ""}
          onChange={(e) => setBioLength(e.target.value.length)}
          placeholder="What you work on, what you teach, and what kind of collaborators you are looking for."
          style={{ minHeight: 130 }}
        />
      </div>
      <div className="form-field">
        <label htmlFor="ab-office">Office</label>
        <input id="ab-office" name="office" className="input" defaultValue={person.office ?? ""} placeholder="Block C · Room 214" />
      </div>
      <div className="form-field">
        <label htmlFor="ab-ext">Phone extension</label>
        <input id="ab-ext" name="phone_ext" className="input" defaultValue={person.phone_ext ?? ""} placeholder="Ext. 4127" />
      </div>
      <div className={`form-field span-2${bad("orcid")}`}>
        <label htmlFor="ab-orcid">ORCID iD</label>
        <input id="ab-orcid" name="orcid" className="input mono" defaultValue={person.orcid ?? ""} placeholder="0000-0002-1825-0097" />
      </div>
      <div className="form-actions span-2">
        <Status result={result} />
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? <span className="spin" /> : <Icon name="check" />}
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- skills */
const CAT_LABEL = { research: "Research", tools: "Tools", teaching: "Teaching" } as const;
type Skill = { skill: string; category: keyof typeof CAT_LABEL };

export function SkillsEditor({ personId, skills }: { personId: string | null; skills: Skill[] }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<keyof typeof CAT_LABEL>("research");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      const r = await addSkill(personId, text, category);
      setResult(r);
      if (r.ok) setText("");
    });

  return (
    <div className="skills-edit">
      {(Object.keys(CAT_LABEL) as (keyof typeof CAT_LABEL)[]).map((cat) => {
        const list = skills.filter((s) => s.category === cat);
        return (
          <div key={cat} className="skill-row">
            <span className="eyebrow">{CAT_LABEL[cat]}</span>
            <div className="chips">
              {list.length === 0 && <span className="muted" style={{ fontSize: 13 }}>None yet</span>}
              {list.map((s) => (
                <span key={s.skill} className="tag removable">
                  {s.skill}
                  <button type="button" aria-label={`Remove ${s.skill}`} disabled={pending} onClick={() => start(async () => setResult(await removeSkill(personId, s.skill)))}>
                    <Icon name="x" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <div className="skill-add">
        <label className="sr-only" htmlFor="sk-new">
          New skill
        </label>
        <input
          id="sk-new"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill, e.g. Speech Synthesis"
          maxLength={60}
        />
        <label className="sr-only" htmlFor="sk-cat">
          Category
        </label>
        <select id="sk-cat" className="input select" value={category} onChange={(e) => setCategory(e.target.value as keyof typeof CAT_LABEL)}>
          {(Object.keys(CAT_LABEL) as (keyof typeof CAT_LABEL)[]).map((c) => (
            <option key={c} value={c}>
              {CAT_LABEL[c]}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="button" disabled={pending || !text.trim()} onClick={add}>
          <Icon name="plus" />
          Add
        </button>
      </div>
      <Status result={result && !result.ok ? result : null} />
    </div>
  );
}
