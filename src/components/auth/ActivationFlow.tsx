"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  finishActivation,
  setNewPassword,
  startActivation,
  verifyActivation,
  type Activated,
  type CodeSent,
  type Fail,
  type ProfileDraft,
} from "@/app/(auth)/actions";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { Confetti, DoneBadge, Field, OtpInput, PasswordFields, Stepper, SubmitButton, useShake } from "@/components/auth/parts";
import { Icon } from "@/components/ui/Icon";

type Step = 1 | 2 | 3 | 4 | 5;
type Skill = { skill: string; category: "research" | "tools" };

const initialsOf = (name: string) => {
  const parts = name.replace(/^(Dr\.|Prof\.)\s+/, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/** Crop to a centred square and re-encode as a 480px JPEG before upload. */
async function cropPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const size = 480;
    const m = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ActivationFlow({ demo, resume }: { demo: boolean; resume: ProfileDraft | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(resume ? 3 : 1);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(resume);
  const [error, setError] = useState<Fail | null>(null);
  const [busy, start] = useTransition();
  const [cardRef, shake] = useShake<HTMLDivElement>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [bio, setBio] = useState(resume?.bio ?? "");
  const [skills, setSkills] = useState<Skill[]>(() => (resume?.skills ?? []).filter((s): s is Skill => s.category !== "teaching"));
  const [newSkill, setNewSkill] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState<Activated | null>(null);

  const [resendIn, setResendIn] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startCountdown = () => {
    setResendIn(30);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setResendIn((s) => (s <= 1 ? (clearInterval(timer.current!), 0) : s - 1)), 1000);
  };

  const failWith = (f: Fail) => {
    setError(f);
    shake();
  };

  /* step 1 */
  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await startActivation(email);
      if (!r.ok) return failWith(r);
      setSent(r);
      setStep(2);
      startCountdown();
    });
  };

  /* step 2 */
  const submitCode = (code: string) => {
    if (!sent) return;
    setError(null);
    start(async () => {
      const r = await verifyActivation(sent.email, code);
      if (!r.ok) {
        setAttempt((a) => a + 1);
        return failWith(r);
      }
      setDraft(r);
      setBio(r.bio);
      setSkills(r.skills.filter((s): s is Skill => s.category !== "teaching"));
      setStep(3);
    });
  };
  const resend = () =>
    start(async () => {
      const r = await startActivation(sent?.email ?? email);
      if (!r.ok) return failWith(r);
      setSent(r);
      setError(null);
      startCountdown();
    });

  /* step 3 */
  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await setNewPassword(password, confirm);
      if (!r.ok) return failWith(r);
      setStep(4);
    });
  };

  /* step 4 */
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return failWith({ ok: false, field: "photo", error: "Choose an image file, such as a JPG or PNG." });
    try {
      const blob = await cropPhoto(file);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setError(null);
    } catch {
      failWith({ ok: false, field: "photo", error: "That image could not be read. Try a JPG or PNG." });
    }
  };
  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || skills.some((x) => x.skill.toLowerCase() === s.toLowerCase())) return setNewSkill("");
    setSkills([...skills, { skill: s.slice(0, 60), category: "research" }]);
    setNewSkill("");
  };
  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = new FormData();
    form.set("bio", bio);
    form.set("skills", JSON.stringify(skills));
    if (terms) form.set("terms", "on");
    if (photo) form.set("photo", new File([photo.blob], "avatar.jpg", { type: "image/jpeg" }));
    start(async () => {
      const r = await finishActivation(form);
      if (!r.ok) return failWith(r);
      setDone(r);
      setStep(5);
    });
  };

  const err = (field: string) => (error?.field === field ? error.error : undefined);
  const generalError = error && !["email", "code", "password", "confirm", "photo", "terms"].includes(error.field ?? "") ? error.error : undefined;

  if (step === 5 && done) {
    return (
      <div className="auth-card" ref={cardRef}>
        <Confetti />
        <div className="af-step af-done">
          <DoneBadge />
          <h2>You&apos;re in, {done.name.replace(/^(Dr\.|Prof\.)\s+/, "").split(" ")[0]}</h2>
          <p className="af-sub">Your account is active. Your profile is now visible to the people in your groups.</p>
          <div className="done-sum">
            <span className="av" style={{ ["--s" as string]: "48px" }}>
              {photo ? <img src={photo.url} alt="" /> : initialsOf(done.name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <b>{done.name}</b>
              <span>{done.groups.length ? done.groups.join(", ") : "Not in a group yet. The research office adds people to groups."}</span>
            </div>
          </div>
          <SubmitButton type="button" busyLabel="" onClick={() => router.push("/")}>
            <span>Go to Faculty Atlas</span>
            <Icon name="arrow" />
          </SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card" ref={cardRef}>
      {step === 1 && <AuthTabs active="signup" />}
      <div className="af-step" key={step}>
        <Stepper labels={["Email", "Verify", "Password", "Profile"]} step={step} />

        {step === 1 && (
          <>
            <h2>Activate your account</h2>
            <p className="af-sub">The research office creates every account. Enter the work email they registered for you.</p>
            <form className="af-form" onSubmit={submitEmail} noValidate>
              <Field id="su-email" label="Work email" icon="mail" type="email" autoComplete="email" value={email} onChange={setEmail} error={error?.notFound ? undefined : err("email")} />
              {error?.notFound && (
                <div className="af-notfound" role="alert">
                  <Icon name="lock" />
                  <span>
                    <b>This email is not in the directory.</b> {error.error}
                  </span>
                </div>
              )}
              {generalError && <p className="af-err on">{generalError}</p>}
              <SubmitButton busy={busy} busyLabel="Checking the directory…">
                <span>Continue</span>
                <Icon name="arrow" />
              </SubmitButton>
            </form>
            {demo && (
              <div className="af-hint">
                <span>Demo accounts waiting to be activated:</span>
                <button type="button" onClick={() => setEmail("k.watanabe@northfield.edu")}>
                  k.watanabe@northfield.edu
                </button>
                <button type="button" onClick={() => setEmail("n.said@northfield.edu")}>
                  n.said@northfield.edu
                </button>
              </div>
            )}
            <p className="af-foot">
              Already active?{" "}
              <Link href="/login" className="af-link">
                Sign in
              </Link>
            </p>
          </>
        )}

        {step === 2 && sent && (
          <>
            <h2>Check your email</h2>
            <p className="af-sub">
              We found you in the directory and sent a code to <b>{sent.masked}</b>.
            </p>
            {sent.demoCode && (
              <div className="af-demo-code">
                <Icon name="info" />
                <span>
                  Demo mode: no email is sent. Your code is <b className="mono">{sent.demoCode}</b>
                </span>
              </div>
            )}
            <form className="af-form" onSubmit={(e) => e.preventDefault()} noValidate>
              <OtpInput key={`${sent.demoCode ?? sent.masked}-${attempt}`} length={sent.demoCode?.length ?? 6} onComplete={submitCode} error={err("code")} />
              {busy && (
                <p className="pw-label" aria-live="polite">
                  Verifying…
                </p>
              )}
            </form>
            <p className="af-foot">
              <button type="button" className="af-link" disabled={resendIn > 0 || busy} onClick={resend}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
              {" · "}
              <button
                type="button"
                className="af-link"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Create a password</h2>
            <p className="af-sub">{draft ? `Signing in as ${draft.name}.` : "You'll use this with your work email."}</p>
            <form className="af-form" onSubmit={submitPassword} noValidate>
              <PasswordFields password={password} confirm={confirm} setPassword={setPassword} setConfirm={setConfirm} errors={{ password: err("password"), confirm: err("confirm") }} />
              {generalError && <p className="af-err on">{generalError}</p>}
              <SubmitButton busy={busy} busyLabel="Saving…">
                <span>Continue</span>
                <Icon name="arrow" />
              </SubmitButton>
            </form>
          </>
        )}

        {step === 4 && draft && (
          <>
            <h2>Make it yours</h2>
            <p className="af-sub">This is how colleagues in your groups will see you. You can change everything later.</p>
            <form className="af-form" onSubmit={submitProfile} noValidate>
              <div className="su-photo">
                <label className="su-ava" htmlFor="su-photo-file" title="Upload a photo">
                  <span className="av" style={{ ["--s" as string]: "84px" }}>
                    {photo ? <img src={photo.url} alt="Your new profile photo" /> : initialsOf(draft.name)}
                  </span>
                  <span className="su-cam">
                    <Icon name="upload" />
                  </span>
                </label>
                <div style={{ minWidth: 0 }}>
                  <b>{draft.name}</b>
                  <span>
                    {draft.title} · {draft.department}
                  </span>
                  <small>Click the photo to upload your own (JPG or PNG).</small>
                </div>
                <input type="file" id="su-photo-file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </div>
              {err("photo") && <p className="af-err on">{err("photo")}</p>}
              <div className="af-field area">
                <textarea className="af-input" id="su-bio" placeholder=" " maxLength={1200} value={bio} onChange={(e) => setBio(e.target.value)} />
                <label htmlFor="su-bio">Short bio</label>
              </div>
              <div>
                <span className="eyebrow">Your skills · tap to remove</span>
                <div className="su-skills">
                  {skills.map((s) => (
                    <button key={s.skill} type="button" className="su-sk on" aria-label={`Remove ${s.skill}`} onClick={() => setSkills(skills.filter((x) => x.skill !== s.skill))}>
                      {s.skill} ×
                    </button>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Add a skill, e.g. Speech Synthesis"
                    aria-label="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <button type="button" className="btn" onClick={addSkill}>
                    <Icon name="plus" />
                    Add
                  </button>
                </div>
              </div>
              <label className={`af-check${err("terms") ? " bad" : ""}`}>
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span />I agree to the faculty data policy
              </label>
              {err("terms") && <p className="af-err on">{err("terms")}</p>}
              {generalError && <p className="af-err on">{generalError}</p>}
              <SubmitButton busy={busy} busyLabel="Setting up your profile…">
                <span>Finish setup</span>
                <Icon name="check" />
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
