"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ---------------------------------------------------------------- helpers */

export type Fail = { ok: false; field?: string; error: string; notFound?: boolean };
const fail = (error: string, field?: string, extra: Partial<Fail> = {}): Fail => ({ ok: false, error, field, ...extra });

const isEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e);
const demoMode = () => process.env.FA_DEMO_MODE === "true";
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

const maskEmail = (e: string) => e.replace(/^(.)(.*?)(@.*)$/, (_m, a: string, b: string, c: string) => a + "•".repeat(Math.max(2, b.length)) + c);

/** Only allow redirects to paths inside this app. */
const safeNext = (next: string) => (next.startsWith("/") && !next.startsWith("//") ? next : "/");

/** Directory lookup with the secret key (signed-out visitors can't read the table themselves). */
async function lookupPerson(email: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("people").select("id, status").eq("email", email).maybeSingle();
  return data;
}

/**
 * Sends a one-time code to the email. In demo mode no email is sent: the sample addresses are
 * fictional, so the code is generated with the admin API and shown on screen instead.
 */
async function sendCode(email: string): Promise<{ demoCode?: string } | Fail> {
  if (demoMode()) {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data.properties?.email_otp) return fail("We could not create a code right now. Try again in a minute.");
    return { demoCode: data.properties.email_otp };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    return fail(
      error.status === 429 ? "Too many codes requested. Wait a minute and try again." : "We could not send the code. Try again in a minute.",
    );
  }
  return {};
}

async function verifyCode(email: string, code: string) {
  const supabase = await createClient();
  let { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) ({ error } = await supabase.auth.verifyOtp({ email, token: code, type: "magiclink" }));
  return !error;
}

function passwordProblem(pw: string, confirm: string) {
  const score = [/\d/, /[A-Z]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length < 8 || score < 2) return fail("Use 8+ characters and at least two of: a number, an uppercase letter, a symbol.", "password");
  if (pw !== confirm) return fail("The passwords do not match.", "confirm");
  return null;
}

/* ---------------------------------------------------------------- sign in */

export type SignInState = Fail | { ok: true } | null;

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = clean(form.get("email")).toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(clean(form.get("next")) || "/");

  if (!isEmail(email)) return fail("Enter your work email, like name@northfield.edu.", "email");
  if (password.length < 8) return fail("Passwords have at least 8 characters.", "password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const person = await lookupPerson(email);
    if (person?.status === "invited") return fail("This account is not activated yet. Use Create account to activate it.", "email");
    if (person?.status === "deactivated") return fail("This account has been deactivated. Contact the research office.", "email");
    if (person) return fail("That password is not right. Try again, or reset it.", "password");
    return fail("We couldn't sign you in with this email and password.", "email");
  }

  const { data } = await supabase.rpc("my_account");
  const account = data?.[0];
  if (account?.status === "deactivated") {
    await supabase.auth.signOut();
    return fail("This account has been deactivated. Contact the research office.", "email");
  }
  redirect(account?.status === "invited" ? "/signup" : next);
}

/** Demo buttons: the password never reaches the browser. Only works when FA_DEMO_MODE=true. */
export async function demoSignIn(account: "admin" | "member", next = "/"): Promise<SignInState> {
  if (!demoMode() || !process.env.DEMO_PASSWORD) return fail("Demo accounts are turned off.");
  const email = account === "admin" ? "research.office@northfield.edu" : "a.raza@northfield.edu";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) return fail("The demo account could not sign in. Run scripts/create-auth-accounts.mjs again.");
  redirect(safeNext(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ---------------------------------------------------------------- activation */

export type CodeSent = { ok: true; email: string; masked: string; demoCode?: string };

export async function startActivation(emailRaw: string): Promise<CodeSent | Fail> {
  const email = emailRaw.trim().toLowerCase();
  if (!isEmail(email)) return fail("Enter your work email, like name@northfield.edu.", "email");
  const person = await lookupPerson(email);
  if (!person) {
    return fail(
      "Only people registered by the research office can create an account. Ask them at research.office@northfield.edu.",
      "email",
      { notFound: true },
    );
  }
  if (person.status === "active") return fail("This account is already active. Sign in instead.", "email");
  if (person.status === "deactivated") return fail("This account has been deactivated. Contact the research office.", "email");

  const sent = await sendCode(email);
  if ("ok" in sent) return sent;
  return { ok: true, email, masked: maskEmail(email), demoCode: sent.demoCode };
}

export type ProfileDraft = {
  ok: true;
  name: string;
  title: string;
  department: string;
  bio: string;
  skills: { skill: string; category: "research" | "tools" | "teaching" }[];
};

async function loadDraft(): Promise<ProfileDraft | Fail> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_account");
  const me = data?.[0];
  if (!me?.person_id) return fail("We could not find your directory entry. Contact the research office.");
  const [{ data: person }, { data: skills }] = await Promise.all([
    supabase.from("people").select("bio").eq("id", me.person_id).single(),
    supabase.from("person_skills").select("skill, category").eq("person_id", me.person_id).order("position"),
  ]);
  return {
    ok: true,
    name: me.full_name ?? "",
    title: me.title ?? "",
    department: me.department ?? "",
    bio: person?.bio ?? "",
    skills: skills ?? [],
  };
}

export async function verifyActivation(emailRaw: string, code: string): Promise<ProfileDraft | Fail> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^\d{6,8}$/.test(code)) return fail("Enter all the digits of the code.", "code");
  if (!(await verifyCode(email, code))) return fail("That code is not right or has expired. Check it and try again.", "code");
  return loadDraft();
}

/** Used when someone verified their email earlier but left before finishing. */
export async function resumeActivation(): Promise<ProfileDraft | Fail> {
  return loadDraft();
}

export async function setNewPassword(password: string, confirm: string): Promise<{ ok: true } | Fail> {
  const problem = passwordProblem(password, confirm);
  if (problem) return problem;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return fail(
      error.code === "same_password" ? "Choose a password you have not used before." : "Your session expired. Start again from the email step.",
      "password",
    );
  }
  return { ok: true };
}

export type Activated = { ok: true; name: string; groups: string[] };

export async function finishActivation(form: FormData): Promise<Activated | Fail> {
  if (form.get("terms") !== "on") return fail("Please agree to the data policy to continue.", "terms");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_account");
  const me = data?.[0];
  if (!me?.person_id) return fail("Your session expired. Start again from the email step.");
  const personId = me.person_id;

  const bio = clean(form.get("bio")).slice(0, 1200);
  let skills: { skill: string; category: "research" | "tools" }[] = [];
  try {
    skills = (JSON.parse(String(form.get("skills") ?? "[]")) as typeof skills)
      .filter((s) => s && typeof s.skill === "string" && (s.category === "research" || s.category === "tools"))
      .slice(0, 30);
  } catch {
    return fail("Something went wrong with your skills. Try again.");
  }

  const photo = form.get("photo");
  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 5 * 1024 * 1024) {
      return fail("The photo must be a JPG, PNG or WebP under 5 MB.", "photo");
    }
    photoPath = `${personId}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("photos").upload(photoPath, photo, { contentType: photo.type, upsert: true });
    if (error) return fail("We could not upload your photo. Try a smaller image.", "photo");
  }

  const { error: bioError } = await supabase
    .from("people")
    .update({ bio: bio || null, ...(photoPath ? { photo_path: photoPath } : {}) })
    .eq("id", personId);
  if (bioError) return fail("We could not save your profile. Try again.");

  await supabase.from("person_skills").delete().eq("person_id", personId).in("category", ["research", "tools"]);
  if (skills.length) {
    const { error } = await supabase
      .from("person_skills")
      .insert(skills.map((s, i) => ({ person_id: personId, skill: s.skill.slice(0, 60), category: s.category, position: i })));
    if (error) return fail("We could not save your skills. Try again.");
  }

  const { error: activateError } = await supabase.rpc("activate_my_account");
  if (activateError) return fail("We could not activate your account. Try again.");

  const { data: groups } = await supabase.from("group_members").select("groups(name)").eq("person_id", personId);
  return {
    ok: true,
    name: me.full_name ?? "",
    groups: (groups ?? []).map((g) => (g.groups as { name: string } | null)?.name).filter((n): n is string => Boolean(n)),
  };
}

/* ---------------------------------------------------------------- password reset */

export async function startReset(emailRaw: string): Promise<CodeSent | Fail> {
  const email = emailRaw.trim().toLowerCase();
  if (!isEmail(email)) return fail("Enter your work email, like name@northfield.edu.", "email");
  const person = await lookupPerson(email);
  if (!person) return fail("No account uses this email.", "email");
  if (person.status === "invited") return fail("This account is not activated yet. Use Create account to activate it.", "email");
  if (person.status === "deactivated") return fail("This account has been deactivated. Contact the research office.", "email");
  const sent = await sendCode(email);
  if ("ok" in sent) return sent;
  return { ok: true, email, masked: maskEmail(email), demoCode: sent.demoCode };
}

export async function verifyReset(emailRaw: string, code: string): Promise<{ ok: true } | Fail> {
  if (!/^\d{6,8}$/.test(code)) return fail("Enter all the digits of the code.", "code");
  if (!(await verifyCode(emailRaw.trim().toLowerCase(), code))) return fail("That code is not right or has expired. Check it and try again.", "code");
  return { ok: true };
}

export async function finishReset(password: string, confirm: string): Promise<{ ok: true } | Fail> {
  const result = await setNewPassword(password, confirm);
  if (!result.ok) return result;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}
