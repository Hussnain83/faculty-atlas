import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const notice = typeof params.error === "string" ? params.error : undefined;
  return <LoginForm next={next} notice={notice} demo={process.env.FA_DEMO_MODE === "true"} />;
}
