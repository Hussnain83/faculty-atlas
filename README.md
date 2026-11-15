# Faculty Atlas

A private research directory for a university. The research office registers staff and organises
them into research groups. Researchers and teachers keep their own profiles up to date: photo, CV,
skills, career, achievements and publications. Everyone sees only colleagues who share a group with
them.

Built with Next.js 16 and Supabase.

## Documents

- [docs/LAUNCH.md](docs/LAUNCH.md): putting the site live (database, email, hosting, domain, first admin, importing people)
- [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md): day-to-day guide for the research office
- [docs/HANDOVER.md](docs/HANDOVER.md): how it works, for whoever maintains it

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase values. For the sample-data demo,
   set `FA_DEMO_MODE=true` and `DEMO_PASSWORD`.
3. `npm run dev`, then open http://localhost:3000

## Checks

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run db:test
```
