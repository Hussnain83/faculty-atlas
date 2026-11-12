"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { finishReset, startReset, verifyReset, type CodeSent, type Fail } from "@/app/(auth)/actions";
import { Confetti, DoneBadge, Field, OtpInput, PasswordFields, Stepper, SubmitButton, useShake } from "@/components/auth/parts";
import { Icon } from "@/components/ui/Icon";

export function ResetFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<Fail | null>(null);
  const [busy, start] = useTransition();
  const [cardRef, shake] = useShake<HTMLDivElement>();
  const [resendIn, setResendIn] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const countdown = () => {
    setResendIn(30);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setResendIn((s) => (s <= 1 ? (clearInterval(timer.current!), 0) : s - 1)), 1000);
  };
  const failWith = (f: Fail) => {
    setError(f);
    shake();
  };
  const err = (field: string) => (error?.field === field ? error.error : undefined);

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const r = await startReset(sent?.email ?? email);
      if (!r.ok) return failWith(r);
      setSent(r);
      setStep(2);
      countdown();
    });
  };
  const checkCode = (code: string) =>
    start(async () => {
      setError(null);
      const r = await verifyReset(sent!.email, code);
      if (!r.ok) {
        setAttempt((a) => a + 1);
        return failWith(r);
      }
      setStep(3);
    });
  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await finishReset(password, confirm);
      if (!r.ok) return failWith(r);
      setStep(4);
    });
  };

  if (step === 4) {
    return (
      <div className="auth-card" ref={cardRef}>
        <Confetti />
        <div className="af-step af-done">
          <DoneBadge />
          <h2>Password updated</h2>
          <p className="af-sub">Sign in with your new password.</p>
          <SubmitButton type="button" busyLabel="" onClick={() => router.push("/login")}>
            <span>Back to sign in</span>
            <Icon name="arrow" />
          </SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card" ref={cardRef}>
      <div className="af-step" key={step}>
        <Link href="/login" className="back">
          <Icon name="back" />
          Back to sign in
        </Link>
        <Stepper labels={["Email", "Verify", "New password"]} step={step} />
        {step === 1 && (
          <>
            <h2>Reset your password</h2>
            <p className="af-sub">Enter your work email and we will send you a code.</p>
            <form className="af-form" onSubmit={sendCode} noValidate>
              <Field id="fp-email" label="Work email" icon="mail" type="email" autoComplete="email" value={email} onChange={setEmail} error={err("email")} />
              <SubmitButton busy={busy} busyLabel="Sending code…">
                <span>Send code</span>
                <Icon name="mail" />
              </SubmitButton>
            </form>
          </>
        )}
        {step === 2 && sent && (
          <>
            <h2>Check your email</h2>
            <p className="af-sub">
              Enter the code we sent to <b>{sent.masked}</b>.
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
              <OtpInput key={`${sent.demoCode ?? sent.masked}-${attempt}`} length={sent.demoCode?.length ?? 6} onComplete={checkCode} error={err("code")} />
              {busy && <p className="pw-label">Verifying…</p>}
            </form>
            <p className="af-foot">
              <button type="button" className="af-link" disabled={resendIn > 0 || busy} onClick={() => sendCode()}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Choose a new password</h2>
            <p className="af-sub">For {sent?.masked}</p>
            <form className="af-form" onSubmit={savePassword} noValidate>
              <PasswordFields password={password} confirm={confirm} setPassword={setPassword} setConfirm={setConfirm} errors={{ password: err("password"), confirm: err("confirm") }} />
              <SubmitButton busy={busy} busyLabel="Updating…">
                <span>Update password</span>
                <Icon name="check" />
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
