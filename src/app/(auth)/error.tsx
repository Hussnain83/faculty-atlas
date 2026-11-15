"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function AuthError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} homeHref="/login" />;
}
