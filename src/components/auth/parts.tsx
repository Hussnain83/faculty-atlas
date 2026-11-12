"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/* ---------- floating-label input ---------- */
export function Field({
  id,
  label,
  icon,
  type = "text",
  name,
  value,
  onChange,
  defaultValue,
  autoComplete = "off",
  error,
  onKeyDown,
}: {
  id: string;
  label: string;
  icon: IconName;
  type?: "text" | "email" | "password";
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  autoComplete?: string;
  error?: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={`af-field${error ? " bad" : ""}`}>
      <span className="af-ic">
        <Icon name={icon} />
      </span>
      <input
        className="af-input"
        id={id}
        name={name ?? id}
        type={isPassword && show ? "text" : type}
        placeholder=" "
        autoComplete={autoComplete}
        spellCheck={type === "email" ? false : undefined}
        inputMode={type === "email" ? "email" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...(value !== undefined ? { value, onChange: (e) => onChange?.(e.target.value) } : { defaultValue })}
        onKeyDown={onKeyDown}
      />
      <label htmlFor={id}>{label}</label>
      {isPassword && (
        <button type="button" className="af-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
          <Icon name={show ? "eyeoff" : "eye"} />
        </button>
      )}
      {error && (
        <p className="af-err on" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- shake the card on errors ---------- */
export function useShake<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const shake = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }, []);
  return [ref, shake] as const;
}

/* ---------- step indicator ---------- */
export function Stepper({ labels, step }: { labels: string[]; step: number }) {
  const progress = Math.min(1, (step - 1) / (labels.length - 1));
  return (
    <ol
      className="af-steps"
      style={{ ["--n" as string]: labels.length, ["--p" as string]: progress.toFixed(3) }}
      aria-label={`Step ${step} of ${labels.length}`}
    >
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "on" : "";
        return (
          <li key={label} className={state} aria-current={n === step ? "step" : undefined}>
            <span>{n < step ? <Icon name="check" /> : n}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- one-time code boxes ---------- */
export function OtpInput({ length = 6, onComplete, error }: { length?: number; onComplete: (code: string) => void; error?: string }) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Parents remount this component (new key) after a wrong code, which clears the boxes.
  useEffect(() => {
    if (error || window.matchMedia("(hover: hover)").matches) refs.current[0]?.focus();
  }, [error]);

  const update = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    const next = [...digits];
    if (typed.length > 1) {
      // Autofill (e.g. a phone suggesting the code from the email) drops the whole code into one box.
      const chars = typed.slice(0, length).split("");
      chars.forEach((c, k) => {
        if (i + k < length) next[i + k] = c;
      });
      refs.current[Math.min(i + chars.length, length - 1)]?.focus();
      return update(next);
    }
    next[i] = typed;
    if (typed && i < length - 1) refs.current[i + 1]?.focus();
    update(next);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!d) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => d[i] ?? "");
    refs.current[Math.min(d.length, length - 1)]?.focus();
    update(next);
  };

  return (
    <>
      <div className={`otp${error ? " bad" : ""}`} style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={d ? "filled" : ""}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
          />
        ))}
      </div>
      {error && (
        <p className="af-err on" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/* ---------- password + confirm with strength meter ---------- */
const LABELS = ["Use 8 or more characters", "Weak", "Fair", "Good", "Strong"];
export function PasswordFields({
  password,
  confirm,
  setPassword,
  setConfirm,
  errors,
}: {
  password: string;
  confirm: string;
  setPassword: (v: string) => void;
  setConfirm: (v: string) => void;
  errors: { password?: string; confirm?: string };
}) {
  const rules = { len: password.length >= 8, num: /\d/.test(password), up: /[A-Z]/.test(password), sym: /[^A-Za-z0-9]/.test(password) };
  const score = Object.values(rules).filter(Boolean).length;
  return (
    <>
      <Field id="new-password" label="New password" icon="key" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} />
      <div className="pw-meter" data-s={password ? score : 0} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p className="pw-label" aria-live="polite">
        {!password ? LABELS[0] : score === 0 ? "Too weak" : LABELS[score] + (score < 3 ? " · add more variety" : "")}
      </p>
      <ul className="pw-rules">
        <li className={rules.len ? "ok" : ""}>8+ characters</li>
        <li className={rules.num ? "ok" : ""}>A number</li>
        <li className={rules.up ? "ok" : ""}>An uppercase letter</li>
        <li className={rules.sym ? "ok" : ""}>A symbol</li>
      </ul>
      <Field id="confirm-password" label="Confirm password" icon="key" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
    </>
  );
}

/* ---------- submit button with spinner ---------- */
export function SubmitButton({ busy, busyLabel, done, children, type = "submit", onClick }: { busy?: boolean; busyLabel: string; done?: string; children: ReactNode; type?: "submit" | "button"; onClick?: () => void }) {
  return (
    <button className={`btn btn-primary af-submit${busy ? " loading" : ""}${done ? " ok" : ""}`} type={type} disabled={busy} onClick={onClick}>
      {done ? (
        <>
          <Icon name="check" />
          {done}
        </>
      ) : busy ? (
        <>
          <span className="spin" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/* ---------- celebratory confetti ---------- */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const card = document.querySelector(".auth-card")?.getBoundingClientRect();
    const ox = card ? card.left + card.width / 2 : W / 2;
    const oy = card ? card.top + 110 : H / 3;
    const colors = ["#0C9AA6", "#5864EC", "#F2614C", "#EE9B12", "#1FA872"];
    const parts = Array.from({ length: 150 }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 9;
      return { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[Math.floor(Math.random() * 5)] };
    });
    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const el = t - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - el / 2800);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      if (el < 2800) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}

export const DoneBadge = () => (
  <div className="done-badge">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="done-path" pathLength={1} d="m5 12 5 5 9-10" />
    </svg>
  </div>
);
