import { connection } from "next/server";

/**
 * Small live check that the app can reach the Supabase project.
 * Calls the public auth settings endpoint with the publishable key; nothing secret is used or shown.
 */
export async function SupabaseStatus() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let ok = false;
  let reason = "Supabase settings are missing";
  if (url && key) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      ok = res.ok;
      reason = res.ok ? "" : `Supabase answered ${res.status}`;
    } catch {
      reason = "Supabase did not respond";
    }
  }

  return (
    <span className="pill" title={ok ? "The app can reach the Supabase project" : reason}>
      <span className={ok ? "pulse" : "pulse off"} />
      {ok ? "Database connected" : "Database not connected"}
    </span>
  );
}
