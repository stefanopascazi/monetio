// Which deploys may run migrations: every non-Vercel run (local stack, Docker), and only production on Vercel,
// because preview deployments share the production database.

export type MigrationDecision = { run: true } | { run: false; reason: string };

export function migrationDecision(env: Record<string, string | undefined>): MigrationDecision {
  if (!env.VERCEL) return { run: true };
  if (env.VERCEL_ENV === "production") return { run: true };
  return { run: false, reason: `Vercel ${env.VERCEL_ENV ?? "unknown"} deploy: migrations run only in production.` };
}

/** Key of the session advisory lock that serialises concurrent migration runs. */
export const MIGRATION_LOCK_KEY = 7_210_431;
