# Manager Score

Anonymous manager reviews with a low-friction submission flow.

## Stack

- Next.js + TypeScript
- React
- PostgreSQL + Prisma
- Vercel-ready API routes

## Local Development

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000.

## Database Setup

1. Create a Postgres database with Neon or Supabase.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` and `REVIEW_HASH_SALT`.
4. Run:

```bash
npm run prisma:migrate
```

Reviews are submitted anonymously and published immediately as `APPROVED` for the MVP. The status field is still in the schema so moderation can be added later.

## API Routes

- `POST /api/reviews` submits an anonymous review.
- `GET /api/reviews` returns approved recent reviews.
- `GET /api/search?q=google` searches approved manager profiles.
- `POST /api/generate-tags` suggests simple tags for review text.
