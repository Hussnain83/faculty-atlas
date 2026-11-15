/**
 * Sign-in and privacy tests. Run with: npm test
 *
 * 1. Redirect safety (pure unit tests, always run).
 * 2. Sign-in and row-level security against the Supabase project, using the sample accounts
 *    (needs .env.local; skipped without it). Nothing is written to the database.
 * 3. The running app's sign-in gate and security headers (needs `npm run dev`; skipped otherwise).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeNext } from "../src/lib/redirects.ts";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;
const APP = process.env.APP_URL ?? "http://localhost:3000";
const MEMBER = "a.raza@northfield.edu"; // Amina: AI Lab + Computer Vision, 9 people visible
const ADMIN = "research.office@northfield.edu";
const INVITED = "n.said@northfield.edu"; // registered, never activated

const canReachSupabase = Boolean(URL_ && KEY && PASSWORD);
const client = () => createClient(URL_!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

/* ------------------------------------------------------------------ 1 */
describe("redirect after sign-in (safeNext)", () => {
  it("keeps paths inside the app", () => {
    assert.equal(safeNext("/"), "/");
    assert.equal(safeNext("/groups/ai-lab"), "/groups/ai-lab");
    assert.equal(safeNext("/search?q=vision&x=1"), "/search?q=vision&x=1");
  });
  it("refuses anything that could leave the site", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "evil.example", "/ /evil", "/\t/evil", "", "javascript:alert(1)"]) {
      assert.equal(safeNext(bad), "/", `should refuse ${JSON.stringify(bad)}`);
    }
  });
});

/* ------------------------------------------------------------------ 2 */
describe("sign-in and privacy (Supabase)", { skip: !canReachSupabase && "needs .env.local (run with npm test)" }, () => {
  let member: SupabaseClient, admin: SupabaseClient;

  before(async () => {
    member = client();
    admin = client();
    const [m, a] = await Promise.all([
      member.auth.signInWithPassword({ email: MEMBER, password: PASSWORD! }),
      admin.auth.signInWithPassword({ email: ADMIN, password: PASSWORD! }),
    ]);
    assert.ifError(m.error);
    assert.ifError(a.error);
  });
  after(async () => {
    await Promise.all([member?.auth.signOut(), admin?.auth.signOut()]);
  });

  it("rejects a wrong password", async () => {
    const { data, error } = await client().auth.signInWithPassword({ email: MEMBER, password: `${PASSWORD}-wrong` });
    assert.ok(error, "expected an error");
    assert.equal(data.session, null);
  });

  it("rejects an email that has no account", async () => {
    const { error } = await client().auth.signInWithPassword({ email: "nobody-here@northfield.edu", password: PASSWORD! });
    assert.ok(error);
  });

  it("does not let a registered but unactivated person sign in with a password", async () => {
    const { data, error } = await client().auth.signInWithPassword({ email: INVITED, password: PASSWORD! });
    assert.ok(error);
    assert.equal(data.session, null);
  });

  it("shows signed-out visitors nobody", async () => {
    const anon = client();
    const [{ data: people }, { data: papers }] = await Promise.all([anon.from("people").select("id"), anon.from("publications").select("id")]);
    assert.equal(people?.length ?? 0, 0);
    assert.equal(papers?.length ?? 0, 0);
  });

  it("shows a member only the people in their groups", async () => {
    const { data, error } = await member.from("people").select("id, email");
    assert.ifError(error);
    assert.equal(data!.length, 9);
    assert.ok(!data!.some((p) => p.email === "s.marquez@northfield.edu"), "Sofia shares no group with Amina");
  });

  it("shows the admin everyone", async () => {
    const { data, error } = await admin.from("people").select("id");
    assert.ifError(error);
    assert.equal(data!.length, 15);
  });

  it("hides another group's papers from a member, but not from the admin", async () => {
    const { data: g } = await admin.from("groups").select("id").eq("slug", "learning-sciences").single();
    const [{ data: forMember }, { data: forAdmin }] = await Promise.all([member.rpc("group_publications", { gid: g!.id }), admin.rpc("group_publications", { gid: g!.id })]);
    assert.equal(forMember?.length ?? 0, 0);
    assert.ok((forAdmin?.length ?? 0) > 0);
  });

  it("does not let a member edit someone else's profile", async () => {
    const { data: zara } = await member.from("people").select("id, bio").eq("email", "z.siddiqui@northfield.edu").single();
    const { data: changed } = await member.from("people").update({ bio: "changed by a test" }).eq("id", zara!.id).select("id");
    assert.equal(changed?.length ?? 0, 0, "the update must match no rows");
  });

  it("keeps the privacy helpers out of the public API", async () => {
    const { error } = await member.rpc("can_see_person" as never, { pid: "00000000-0000-0000-0000-000000000000" } as never);
    assert.ok(error, "private helpers must not be callable");
  });
});

/* ------------------------------------------------------------------ 3 */
let appUp = false;
try {
  appUp = (await fetch(`${APP}/login`, { redirect: "manual", signal: AbortSignal.timeout(20000) })).status < 500;
} catch {
  appUp = false;
}

describe("the running app", { skip: !appUp && `start the app first (npm run dev) at ${APP}` }, () => {
  it("sends signed-out visitors to sign-in, remembering where they were going", async () => {
    const res = await fetch(`${APP}/groups/ai-lab`, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(res.status), `got ${res.status}`);
    const to = new URL(res.headers.get("location")!, APP);
    assert.equal(to.pathname, "/login");
    assert.equal(to.searchParams.get("next"), "/groups/ai-lab");
  });

  it("keeps the sign-up and password reset pages open", async () => {
    for (const p of ["/login", "/signup", "/forgot"]) {
      const res = await fetch(`${APP}${p}`, { redirect: "manual" });
      assert.equal(res.status, 200, p);
    }
  });

  it("sends browser security headers", async () => {
    const res = await fetch(`${APP}/login`, { redirect: "manual" });
    assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  it("never shows search results to signed-out visitors", async () => {
    const res = await fetch(`${APP}/search?q=Amina`, { redirect: "manual" });
    assert.notEqual(res.status, 200);
    const body = await res.text();
    assert.ok(!body.includes("a.raza@northfield.edu"));
  });
});
