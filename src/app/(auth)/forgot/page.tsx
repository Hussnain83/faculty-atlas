import type { Metadata } from "next";
import { ResetFlow } from "@/components/auth/ResetFlow";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return <ResetFlow />;
}
