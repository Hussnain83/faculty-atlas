/**
 * Public Supabase settings. Both values are safe to expose to the browser:
 * the publishable key only grants what the database's row-level security allows.
 * The secret key and database password must never be read in client code.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase settings. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local (and to Vercel for the live site).",
    );
  }
  return { url, key };
}
