"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}
