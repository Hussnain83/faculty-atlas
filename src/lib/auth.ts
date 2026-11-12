import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type PersonStatus = Database["public"]["Enums"]["person_status"];

export type Account = {
  userId: string;
  email: string;
  isAdmin: boolean;
  person: {
    id: string;
    fullName: string;
    title: string;
    department: string;
    photoPath: string | null;
    status: PersonStatus;
  } | null;
};

/** The signed-in account, read once per request. Returns null when signed out. */
export const getAccount = cache(async (): Promise<Account | null> => {
  // Session checks compare token expiry with the clock, so they must run at request time,
  // never while Next.js prefetches the page shell.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("my_account");
  const row = data?.[0];
  return {
    userId: user.id,
    email: user.email ?? "",
    isAdmin: Boolean(row?.is_admin),
    person: row?.person_id
      ? {
          id: row.person_id,
          fullName: row.full_name ?? "",
          title: row.title ?? "",
          department: row.department ?? "",
          photoPath: row.photo_path ?? null,
          status: row.status as PersonStatus,
        }
      : null,
  };
});

/**
 * For pages inside the app: sends signed-out visitors to sign-in, unfinished activations
 * back to the activation flow, and deactivated people out.
 */
export async function requireAccount(): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (!account.isAdmin) {
    if (!account.person) redirect("/login?error=no-profile");
    if (account.person.status === "invited") redirect("/signup");
    if (account.person.status === "deactivated") redirect("/login?error=deactivated");
  }
  return account;
}

export function displayName(account: Account) {
  return account.isAdmin && !account.person ? "Research Office" : (account.person?.fullName ?? account.email);
}

export function initials(name: string) {
  const parts = name.replace(/^(Dr\.|Prof\.)\s+/, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
