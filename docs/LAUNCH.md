# Launching Faculty Atlas

Step by step, from nothing to the live site. Plan about two hours. You need:
a GitHub account (the code is at `Hussnain83/faculty-atlas`), and free accounts at
**Supabase**, **Vercel** and **Resend**, plus a domain you can add DNS records to.

The current Supabase project (`hgnhtwfawlqrtqfhmmmo`) holds the fictional sample data. Keep it as the
demo and testing copy. The live site gets a **new, empty** project.

---

## 1. Create the production database (Supabase)

1. supabase.com → **New project**. Name it `faculty-atlas-prod`, choose the region closest to the
   university, and save the database password in a password manager.
2. When it is ready, open **Project Settings → API Keys** and note:
   - Project URL (`https://<ref>.supabase.co`)
   - Publishable key (`sb_publishable_…`)
   - Secret key (`sb_secret_…`) — treat it like a password.
3. Put the tables, privacy rules and storage buckets into it. In the project folder:

   ```bash
   npx supabase link --project-ref <NEW-PROD-REF>
   ```

   ```bash
   npx supabase db push --remote
   ```

   This applies every file in `supabase/migrations`. It does **not** load the sample data
   (`supabase/seed.sql`), so the new project starts empty.
4. Check it worked: **Table Editor** should show `people`, `groups`, `publications` and the others,
   and **Storage** should show the private buckets `photos` and `cvs`.
5. Point the CLI back at the demo project, so `npm run db:test` and other commands keep using the sample data:

   ```bash
   npx supabase link --project-ref hgnhtwfawlqrtqfhmmmo
   ```

## 2. Sign-in settings (Supabase → Authentication)

| Where | Setting |
| --- | --- |
| Sign In / Providers → Email | Email provider **on**. **Allow new users to sign up: off.** Only the research office adds people. |
| Sign In / Providers → Email | **Email OTP length: 6**, Email OTP expiration: 3600 seconds |
| URL Configuration | Site URL: your live address, e.g. `https://atlas.your-uni.edu` |
| Emails → Templates → Magic link | Subject: `Your Faculty Atlas code: {{ .Token }}`. Body: paste `supabase/templates/magic-link.html` |
| Rate Limits | After SMTP is set up (step 3), raise "emails per hour" to about 100 |

Turning sign-ups off is safe: the app creates accounts with the secret key when the research office
registers someone, and people then activate them with an emailed code.

## 3. Real email (Resend)

Supabase's built-in email sends only a few messages per hour, so it is not suitable for real use.

1. resend.com → **Domains → Add domain**, for example `mail.your-uni.edu`. Add the DNS records it
   shows (SPF and DKIM) at your DNS provider, or ask the university IT team. Wait until the domain
   shows **Verified**.
2. **API Keys → Create**, with "Sending access" only. Copy it once.
3. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: `no-reply@mail.your-uni.edu`, sender name: `Faculty Atlas`
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key
4. Send yourself a test after step 6 by using **Forgot password?** on the live site.

If the university prefers its own mail server, put its SMTP details here instead. University inboxes
sometimes trust their own server more.

## 4. Put the site online (Vercel)

1. vercel.com → **Add New → Project → Import** `Hussnain83/faculty-atlas`. Framework: Next.js
   (detected). Leave the build settings at their defaults.
2. Before the first deploy, open **Environment Variables** and add these for *Production*.
   The full list with explanations is in `.env.example`:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | production Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | production publishable key |
   | `SUPABASE_SECRET_KEY` | production secret key |
   | `NEXT_PUBLIC_ORG_NAME` | e.g. `University of Lahore` |
   | `NEXT_PUBLIC_ORG_SHORT` | e.g. `UOL` |
   | `NEXT_PUBLIC_ORG_EMAIL_DOMAIN` | e.g. `uol.edu.pk` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | the research office address |
   | `FA_OTP_LENGTH` | `6` (same as Supabase) |

   **Do not add `FA_DEMO_MODE` or `DEMO_PASSWORD`** to production.
3. **Deploy.** Open the `*.vercel.app` address: you should see the sign-in page with your
   university's name and no "Demo mode" note.
4. If you change a variable later, use **Deployments → Redeploy**. Names starting `NEXT_PUBLIC_` are
   built into the pages, so they only update after a redeploy.

## 5. Your own domain

1. Vercel → Project → **Settings → Domains → Add**, e.g. `atlas.your-uni.edu`.
2. Add the DNS record Vercel shows (usually a `CNAME` to `cname.vercel-dns.com`). HTTPS is set up
   automatically.
3. Update Supabase → Authentication → URL Configuration → **Site URL** to the new address.

## 6. The first admin

1. Create a file `.env.production.local` in the project folder. It is git-ignored and stays on your
   computer. Put in it only:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<production URL>
   SUPABASE_SECRET_KEY=<production secret key>
   ```

2. Run, with the research office's work email:

   ```bash
   npm run admin:create -- research.office@your-uni.edu
   ```

   It prints the project it is talking to. Check that it is the production one.
3. The admin opens the live site → **Forgot password?** → enters that email → types the emailed code
   → chooses a password. They are now signed in as the research office.

## 7. Bring in the real people

Signed in as the admin:

1. **Groups → New group** for each research group. Each group's short code (e.g. `AI`) is what the
   people file refers to.
2. **People → Import CSV → Download template**, fill it in (one row per person, groups separated
   by `;`), then upload it. The preview shows problems row by row before anything is saved.
3. Open each group and choose its **lead**.
4. Tell staff to go to the site → **Create account** → their work email → code → password. Only people
   in the directory can activate.

## 8. Final checks

- [ ] Sign-in page shows the university name and no demo note
- [ ] A test person can activate with an emailed code (check the spam folder the first time)
- [ ] **Forgot password?** emails a code
- [ ] A member sees only people in their own groups; another group's page says "Members only"
- [ ] Uploading a photo and a PDF CV works on the profile page
- [ ] `https://` padlock on your domain

Later, run the automated checks against the demo project at any time: `npm test` and `npm run db:test`.
