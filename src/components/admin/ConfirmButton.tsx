"use client";

import { useState, useTransition, type ReactNode } from "react";

/** A button that asks "are you sure?" inline before running a Server Action. */
export function ConfirmButton({
  run,
  label,
  confirmLabel,
  question,
  danger,
  icon,
}: {
  run: () => Promise<unknown>;
  label: string;
  confirmLabel: string;
  question: string;
  danger?: boolean;
  icon?: ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking) {
    return (
      <button type="button" className={`btn btn-sm${danger ? " btn-danger" : ""}`} onClick={() => setAsking(true)}>
        {icon}
        {label}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label={question}>
      <span>{question}</span>
      <button
        type="button"
        className={`btn btn-sm${danger ? " btn-danger-solid" : " btn-primary"}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await run();
            setAsking(false);
          })
        }
      >
        {pending ? "Working…" : confirmLabel}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)} disabled={pending}>
        Cancel
      </button>
    </span>
  );
}
