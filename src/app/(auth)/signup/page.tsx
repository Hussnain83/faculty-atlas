import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { resumeActivation } from "@/app/(auth)/actions";
import { ActivationFlow } from "@/components/auth/ActivationFlow";
import { AuthCardSkeleton } from "@/components/auth/AuthTabs";
import { getAccount } from "@/lib/auth";

export const metadata: Metadata = { title: "Activate your account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SignupContent />
    </Suspense>
  );
}

/** Someone who verified their email but left before finishing continues at the password step. */
async function SignupContent() {
  const account = await getAccount();
  if (account && (account.isAdmin || account.person?.status === "active")) redirect("/");
  let resume = null;
  if (account?.person?.status === "invited") {
    const draft = await resumeActivation();
    resume = draft.ok ? draft : null;
  }
  return <ActivationFlow demo={process.env.FA_DEMO_MODE === "true"} resume={resume} />;
}
