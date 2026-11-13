"use server";

import { getAccount } from "@/lib/auth";
import { runSearch, type SearchResults } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

/** Live suggestions for the search box in the top bar. */
export async function quickSearch(q: string): Promise<SearchResults | null> {
  const account = await getAccount();
  if (!account?.person && !account?.isAdmin) return null;
  const supabase = await createClient();
  return runSearch(supabase, String(q ?? ""), account.person?.id ?? null, account.isAdmin, 4);
}
