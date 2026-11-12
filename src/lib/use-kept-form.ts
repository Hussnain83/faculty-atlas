"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState with <form action>, but React does NOT clear the form afterwards.
 * React 19 resets uncontrolled fields after every form-action submission, including ones that
 * return a validation error, which would wipe what the person typed. Submitting through onSubmit
 * keeps their input so they can fix the one field that was wrong.
 */
export function useKeptForm<S>(action: (prev: Awaited<S>, form: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const [, start] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
