This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Run with Docker (local, self-contained)

The repo ships a Docker Compose stack with the app and a minimal self-hosted Supabase
(Postgres, GoTrue auth, PostgREST, a Caddy gateway and Mailpit). It never touches production.

```bash
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Emails (signup, invites, password reset) | http://localhost:8025 |
| Supabase API gateway | http://localhost:8000 |
| Postgres | `postgres://postgres:monetio-local-password@localhost:54322/postgres?sslmode=disable` |

- Migrations in `supabase/migrations` run automatically (`migrate` service) on every `up`.
- A `cron` service replaces the Vercel Cron and calls `/api/cron/sync` daily.
- Defaults are local-only demo secrets. To change them, copy `.env.docker.example` to `.env`
  and run `node scripts/docker/gen-keys.ts` for a new JWT secret and matching keys.
- Invite a member: `docker compose run --rm migrate node scripts/dev/invite.ts you@example.com`.
- Reset everything (deletes local data): `docker compose down -v`.

### `npm run dev` against the local stack

`.env.stack` (committed, local-only values) points the app and scripts at the Docker stack and
takes precedence over `.env.local`, so nothing reaches production.

```bash
npm run stack:dev     # docker-compose.dev.yml: Supabase services only (no app, no cron)
npm run dev:local     # Next dev on http://localhost:3000
```

Also available: `db:migrate:local`, `db:import:local`, `auth:invite:local`, `stack:up` (full stack), `stack:down`.
The `stack:*` scripts find Docker on the PATH or, on Windows, inside WSL (`MONETIO_WSL_DISTRO` picks the distro).
`docker-compose.yml` includes `docker-compose.dev.yml`, so both share the same project and data.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
