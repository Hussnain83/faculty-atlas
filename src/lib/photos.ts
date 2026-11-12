import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Photos and CVs live in private buckets. To show them we create short-lived signed links,
 * as the signed-in person, so storage rules decide who may see each file.
 */
export async function signedUrls(
  supabase: SupabaseClient<Database>,
  bucket: "photos" | "cvs",
  paths: (string | null | undefined)[],
  seconds = 60 * 60,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, seconds);
  (data ?? []).forEach((row) => {
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  });
  return out;
}
