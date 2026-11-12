import "server-only";
import { getAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every admin Server Action starts with this. It re-checks the role on the server. */
export async function requireAdmin() {
  const account = await getAccount();
  if (!account?.isAdmin) throw new Error("Only the research office can do this.");
  return account;
}

/**
 * Makes sure a sign-in account exists for this email (without a password, so the person
 * activates it themselves) and returns its id. Never sends an email.
 */
export async function ensureAuthUser(email: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!error && data.user) return data.user.id;
  for (let page = 1; page < 50; page++) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) break;
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (list.users.length < 200) break;
  }
  throw new Error(error?.message ?? "Could not create the sign-in account.");
}
