// Applies pending SQL migrations from supabase/migrations to the connected database.
// Usage: npm run db:migrate (local Docker stack; on Vercel production the project database, previews skip).
import "./load-local-env.ts";
import { readdirSync } from "node:fs";
import { applyMigrations, appliedMigrations, ensureMigrationsTable, MIGRATIONS_DIR } from "./apply-migrations.ts";
import { connect } from "./connect.ts";
import { MIGRATION_LOCK_KEY, migrationDecision } from "./deploy-guard.ts";
import { pendingMigrations } from "./pending.ts";

const decision = migrationDecision(process.env);
if (!decision.run) {
  console.log(`Skipping migrations. ${decision.reason}`);
  process.exit(0);
}

const sql = connect();

try {
  // Two deploys at once wait for each other instead of applying the same file twice (released on disconnect).
  await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
  await ensureMigrationsTable(sql);
  const pending = pendingMigrations(readdirSync(MIGRATIONS_DIR), await appliedMigrations(sql));
  if (!pending.length) console.log("No pending migrations.");
  await applyMigrations(sql, pending);
} finally {
  await sql.end();
}
