# Faculty Atlas: technical handover

For whoever maintains the site. Launch steps are in [LAUNCH.md](LAUNCH.md); the guide for the
research office is [ADMIN-GUIDE.md](ADMIN-GUIDE.md).

## What it is

An internal research directory. The research office registers staff and puts them in research groups.
Staff activate an account with an emailed code, then keep a rich profile up to date: photo, CV, bio,
skills, career, achievements and publications. Everyone sees only colleagues in their own groups, and
admins see everyone.

## Stack

| Part | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, Turbopack, `cacheComponents`), React 19, TypeScript, Tailwind 4 |
| Data, sign-in, files | Supabase: Postgres with row-level security, Auth (email codes and passwords), Storage |
| Hosting | Vercel (any Node host works) |
| Email | Supabase Auth via custom SMTP (Resend or the university's server) |

Note: this Next.js version differs from older tutorials. `AGENTS.md` points to the bundled docs in
`node_modules/next/dist/docs/`. Request APIs are async, middleware is `src/proxy.ts`, and runtime
data must sit inside `<Suspense>`.

## How privacy works

Privacy is enforced **in the database**, not just in the pages, so nothing the browser does can
get around it.

- Every table has row-level security. Helper functions live in the `private` schema (not callable
  through the API): `current_person_id`, `is_admin`, `can_see_person`, `can_see_publication`,
  `is_group_member`, `is_publication_author`.
- `can_see_person(x)`: you are an admin, or you are x, or you share at least one group with x.
- Photos and CVs are in **private** buckets, one folder per person id. They are served through
  short-lived signed links, made as the signed-in user, so the same rule applies to files.
- Pages and server actions use the user's own session. The **secret key** (`createAdminClient`,
  `src/lib/supabase/admin.ts`) is used only for directory lookups before sign-in, creating sign-in
  accounts when admins register people, and the admin-only scripts. Every admin action starts with
  `requireAdmin()`.
- `public.admin_email_exists` (for admin password resets) can only be called with the secret key.

## Code map

```
src/app/(auth)/        sign in, activate account, reset password (+ actions.ts)
src/app/(app)/         the signed-in app: overview, people, groups, profile editing, search
src/components/        UI: profile-view (3D profile), group-view (3D group page), overview, admin, auth, shell
src/lib/               auth, supabase clients, search, validation, stats, org settings (org.ts)
src/proxy.ts           refreshes the session cookie and sends signed-out visitors to /login
supabase/migrations/   the whole database, in order. Apply with `supabase db push`
supabase/tests/        privacy_rules.sql: 25 database privacy checks (rolls back, changes nothing)
supabase/seed.sql      fictional sample data (demo project only; never load into production)
supabase/templates/    sign-in code email template
scripts/               create-admin, sample accounts, seed generator
tests/                 npm test: sign-in, privacy and security header checks
docs/                  launch, admin guide, this file
```

## Settings

All in `.env.example`, with comments. In short: three Supabase values, four `NEXT_PUBLIC_ORG_*`
or support-email values for the university's name, `FA_OTP_LENGTH`, and `FA_DEMO_MODE`, which
must be off in production.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run locally on http://localhost:3000 (uses `.env.local`) |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | Code checks |
| `npm test` | Sign-in and privacy tests against the **demo** project; app checks need `npm run dev` running |
| `npm run db:test` | The database privacy suite (on the linked project) |
| `npm run db:push` | Apply new migrations to the linked project |
| `npm run db:types` | Regenerate TypeScript types after a schema change |
| `npm run admin:create -- email` | Make someone an admin (uses `.env.production.local`) |
| `npm run db:accounts:reset` | Demo only: reset the sample accounts' passwords |

## Changing the database

1. Add a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_what_it_does.sql`. Never edit
   files that are already applied.
2. Apply it to the demo project, run `npm run db:types`, `npm run db:test` and `npm test`.
3. Apply it to production: `npx supabase link --project-ref <prod>`, then `npx supabase db push --remote`,
   then link back to the demo project.

## Security notes

- Security headers (CSP, no framing, nosniff, HSTS) are set in `next.config.ts`. If you add an outside
  script, font or image host, add it to the CSP there.
- Redirects after sign-in only allow paths inside the site (`src/lib/redirects.ts`, covered by tests).
- Uploads are checked by their real file contents. Supabase also enforces type and size: photos up
  to 5 MB, CVs up to 10 MB, PDF only.
- Sign-ups are closed in Supabase. Accounts are only created for people the research office registers.
- Known trade-off: the activation page tells a visitor whether an email is in the directory (so staff
  get a clear message). Supabase rate limits make bulk guessing slow.
- Archiving a group hides it but does not change who can see whom (see the admin guide).

## Backups and upkeep

- Supabase keeps daily backups on paid plans. On the free plan, export regularly
  (Database → Backups, or `npx supabase db dump`). Free projects pause after a week without use.
- Update dependencies every few months (`npm outdated`), then run the build and both test suites.
- Watch Supabase → Advisors (security and performance) after schema changes.

## Accounts to hand over

GitHub repository · Vercel project · Supabase production project (and the demo one) · Resend account
and domain DNS · the domain registrar. Move each one into the client's organisation, or add their
people as owners.

## Ideas for later

PDF export of CVs and group reports · ORCID / Google Scholar import · university single sign-on ·
email reminders for incomplete profiles · a read-only role for department heads.
