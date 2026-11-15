// Makes someone an admin (the research office). Run once at launch for the first admin,
// and again for any extra admins. Safe to re-run.
//
//   npm run admin:create -- research.office@your-uni.edu
//   npm run admin:create -- research.office@your-uni.edu --remove     (take admin rights away)
//
// No password is set here and none is ever printed. The new admin opens the site, chooses
// "Forgot password?", and sets their own password with the code emailed to them.
// If the email is also in the people directory, the account is linked to that entry.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = (process.argv[2] ?? "").trim().toLowerCase();
const remove = process.argv.includes("--remove");

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Put the PRODUCTION values in .env.production.local.");
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Usage: npm run admin:create -- name@your-uni.edu [--remove]");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Supabase project: ${new URL(url).hostname}`);

async function findUser(address) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit || data.users.length < 200) return hit ?? null;
  }
}

let user = await findUser(email);

if (remove) {
  if (!user) {
    console.log(`${email} has no account. Nothing to remove.`);
    process.exit(0);
  }
  const { error } = await db.from("user_roles").delete().eq("user_id", user.id).eq("role", "admin");
  if (error) throw error;
  console.log(`Admin rights removed from ${email}. The account itself still exists.`);
  process.exit(0);
}

if (!user) {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`Could not create the account: ${error.message}`);
  user = data.user;
  console.log(`Created an account for ${email}.`);
} else {
  console.log(`${email} already has an account.`);
}

const { error: roleError } = await db.from("user_roles").upsert({ user_id: user.id, role: "admin" });
if (roleError) throw roleError;

const { data: person } = await db.from("people").select("id, user_id, status").eq("email", email).maybeSingle();
if (person && person.user_id !== user.id) {
  const { error } = await db.from("people").update({ user_id: user.id }).eq("id", person.id);
  if (error) throw error;
  console.log("Linked to their entry in the people directory.");
}

console.log(`\n${email} is now an admin.`);
console.log('Next: open the site, choose "Forgot password?" and enter this email. A code arrives by email; use it to set a password.');
