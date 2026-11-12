// Creates sign-in accounts for the SAMPLE people and links them to the directory.
// - active people: password = DEMO_PASSWORD (from .env.local), email already confirmed
// - invited people (Kenji, Noura): account without a password, so they can test activation
// - research.office@northfield.edu: the admin account (password = DEMO_PASSWORD)
// Never sends email. Safe to re-run.
// Usage: node --env-file=.env.local scripts/create-auth-accounts.mjs [--reset-passwords]
//   --reset-passwords  set every ACTIVE sample account (and the admin) back to DEMO_PASSWORD,
//                      e.g. after testing activation or password reset
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !secret || !demoPassword) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY or DEMO_PASSWORD in .env.local");
  process.exit(1);
}
const ADMIN_EMAIL = "research.office@northfield.edu";
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const existing = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  data.users.forEach((u) => existing.set(u.email.toLowerCase(), u));
  if (data.users.length < 200) break;
}

async function ensureUser(email, password) {
  const found = existing.get(email.toLowerCase());
  if (found) return { user: found, created: false };
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(password ? { password } : {}),
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { user: data.user, created: true };
}

const { data: people, error: peopleError } = await db.from("people").select("id, email, status, user_id");
if (peopleError) throw peopleError;

let created = 0;
let linked = 0;
for (const p of people) {
  const { user, created: isNew } = await ensureUser(p.email, p.status === "active" ? demoPassword : null);
  if (isNew) created++;
  if (p.user_id !== user.id) {
    const { error } = await db.from("people").update({ user_id: user.id }).eq("id", p.id);
    if (error) throw error;
    linked++;
  }
}

const admin = await ensureUser(ADMIN_EMAIL, demoPassword);
if (admin.created) created++;
const { error: roleError } = await db.from("user_roles").upsert({ user_id: admin.user.id, role: "admin" });
if (roleError) throw roleError;

let reset = 0;
if (process.argv.includes("--reset-passwords")) {
  const { data: active } = await db.from("people").select("user_id").eq("status", "active").not("user_id", "is", null);
  for (const id of [...(active ?? []).map((p) => p.user_id), admin.user.id]) {
    const { error } = await db.auth.admin.updateUserById(id, { password: demoPassword });
    if (error) throw error;
    reset++;
  }
}

console.log(
  `accounts: ${people.length + 1} total, ${created} created, ${linked} newly linked, admin role set for ${ADMIN_EMAIL}` +
    (reset ? `, ${reset} passwords reset to DEMO_PASSWORD` : ""),
);
