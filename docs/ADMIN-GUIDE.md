# Faculty Atlas: guide for the research office

You are the admin. You decide who is in the directory and which research groups they belong to.
Researchers and teachers keep their own profiles up to date.

## The one rule behind everything

**People see only colleagues who share a research group with them.** You (admins) see everyone.
Group names are visible to all, but a group's people, papers and dashboard are for its members only.
So whether someone can see a colleague depends on the groups you put them in.

---

## Adding people

Only people in the directory can create an account. Nobody can sign up on their own.

- **One person:** People → **Register person**. Name, work email, title and department are required.
- **Many people:** People → **Import CSV** → **Download template**, fill it in, upload it.
  - Columns: `full_name, email, title, department, office, phone_ext, joined_year, groups`
  - `groups` holds group short codes separated by `;`, e.g. `AI;DS`. Create the groups first.
  - The preview flags problems (missing email, duplicates, unknown group) before anything is saved.
    Rows already in the directory are skipped, so importing the same file twice is safe.

New people show as **Not activated**. Ask them to open the site → **Create account** → enter their
work email → type the 6-digit code they receive → choose a password. The first screen after that lets
them add a photo, a short bio and skills.

## Research groups

- **Groups → New group:** a name, a short code (1–4 letters or digits, shown on badges), a colour and a description.
- On a group's page, scroll to **Add members**: tick people from the directory and click **Add to group**.
- On each member card: **Make lead** or **Remove**. A person can be in several groups.
- **Archive group** hides a group from lists without deleting anything. **Restore** brings it back.
  Archiving does **not** change who can see whom: its members still see each other. To end that,
  remove the members.

## Profiles

- Anyone can update their own profile from **My profile**: photo, CV (PDF), bio, skills, career,
  achievements and publications. Adding a DOI fills in a paper's details automatically.
- As admin you can edit anyone's profile: open the person → **Edit profile**.
- **Manage** (on a person's page) changes directory details such as name, email or title, or
  **Deactivates** someone who has left. Deactivated people can't sign in and disappear from other
  people's views. Their data is kept, and you can reactivate them later.
- The overview's **Profiles that need attention** lists everyone under 80% complete, with the next
  step for each. Use it to remind people.

## Finding things

Press **/** anywhere, or use the search box at the top, to search people, skills, groups and papers.
Members only find what their groups allow.

## When something goes wrong

| Problem | What to do |
| --- | --- |
| "Only people registered by the research office…" | They aren't in the directory, or used a different email. Check People. |
| The code email doesn't arrive | Check spam. Wait a minute and request a new code (they expire after an hour). If nobody gets emails, the email (SMTP) settings need checking; see the handover document. |
| Someone forgot their password | They use **Forgot password?** on the sign-in page. You never need to know anyone's password. |
| "This account has been deactivated" | Reactivate them from People → the person → Manage. |
| Someone sees a colleague they shouldn't | Check which groups each person is in. Seeing someone means sharing a group. |
| You are locked out as admin | Use **Forgot password?**. If the admin account itself is gone, the technical contact can run `npm run admin:create` again (see LAUNCH.md, step 6). |

## Adding another admin

Your technical contact runs `npm run admin:create -- their.email@your-uni.edu` (and `-- … --remove`
to take the rights away). Admins should be few: they can see and edit every profile.
