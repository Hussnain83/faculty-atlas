"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { demoSignIn, signIn, type SignInState } from "@/app/(auth)/actions";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { Field, SubmitButton, useShake } from "@/components/auth/parts";
import { Icon } from "@/components/ui/Icon";

const NOTICES: Record<string, string> = {
  deactivated: "This account has been deactivated. Contact the research office.",
  "no-profile": "Your account is not linked to the directory yet. Contact the research office.",
};

export function LoginForm({ next, notice, demo }: { next: string; notice?: string; demo: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null);
  const [email, setEmail] = useState("");
  const [caps, setCaps] = useState(false);
  const [demoState, setDemoState] = useState<SignInState>(null);
  const [demoBusy, startDemo] = useTransition();
  const [cardRef, shake] = useShake<HTMLDivElement>();
  const passwordRef = useRef<HTMLDivElement>(null);

  const result = demoState ?? state;
  const fail = result && !result.ok ? result : null;

  useEffect(() => {
    if (fail) shake();
  }, [fail, shake]);

  /** Types the demo email and dots into the form, then signs in on the server. */
  const runDemo = (acc: "admin" | "member") => {
    const target = acc === "admin" ? "research.office@northfield.edu" : "a.raza@northfield.edu";
    const pw = passwordRef.current?.querySelector("input");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDemoState(null);
    const go = () => startDemo(async () => setDemoState(await demoSignIn(acc, next)));
    if (still) {
      setEmail(target);
      go();
      return;
    }
    let i = 0;
    const typeEmail = () => {
      setEmail(target.slice(0, ++i));
      if (i < target.length) setTimeout(typeEmail, 18);
      else {
        let j = 0;
        const typePw = () => {
          if (pw) pw.value = "•".repeat(++j);
          if (j < 12) setTimeout(typePw, 26);
          else setTimeout(go, 200);
        };
        typePw();
      }
    };
    typeEmail();
  };

  const busy = pending || demoBusy;

  return (
    <div className="auth-card" ref={cardRef}>
      <AuthTabs active="login" />
      <div className="af-step">
        <h2>Welcome back</h2>
        <p className="af-sub">Sign in with your Northfield email.</p>
        {notice && NOTICES[notice] && (
          <div className="af-notfound">
            <Icon name="info" />
            <span>{NOTICES[notice]}</span>
          </div>
        )}
        <form action={action} className="af-form" noValidate>
          <input type="hidden" name="next" value={next} />
          <Field
            id="email"
            label="Work email"
            icon="mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            error={fail?.field === "email" || (fail && !fail.field) ? fail.error : undefined}
          />
          <div ref={passwordRef}>
            <Field
              id="password"
              label="Password"
              icon="key"
              type="password"
              autoComplete="current-password"
              defaultValue=""
              error={fail?.field === "password" ? fail.error : undefined}
              onKeyDown={(e) => setCaps(e.getModifierState("CapsLock"))}
            />
          </div>
          {caps && (
            <p className="af-caps">
              <Icon name="info" />
              Caps Lock is on
            </p>
          )}
          <div className="af-row">
            <span />
            <Link href="/forgot" className="af-link">
              Forgot password?
            </Link>
          </div>
          <SubmitButton busy={busy} busyLabel="Signing in…">
            <span>Sign in</span>
            <Icon name="arrow" />
          </SubmitButton>
        </form>
        {demo && (
          <div className="af-demo">
            <span className="eyebrow">Demo accounts · click to sign in</span>
            <div>
              <button type="button" onClick={() => runDemo("admin")} disabled={busy}>
                <span className="av" style={{ ["--s" as string]: "34px", ["--a1" as string]: "#0D1B2A", ["--a2" as string]: "#44566A" }}>
                  RO
                </span>
                <span>
                  <b>Research Office</b>
                  <small>Admin</small>
                </span>
              </button>
              <button type="button" onClick={() => runDemo("member")} disabled={busy}>
                <span className="av" style={{ ["--s" as string]: "34px" }}>
                  AR
                </span>
                <span>
                  <b>Dr. Amina Raza</b>
                  <small>Member · AI Lab</small>
                </span>
              </button>
            </div>
          </div>
        )}
        <p className="af-foot">
          First time here?{" "}
          <Link href="/signup" className="af-link">
            Activate your account
          </Link>
        </p>
      </div>
    </div>
  );
}
