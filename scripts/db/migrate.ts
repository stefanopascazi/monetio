// Applies pending SQL migrations from supabase/migrations to the connected database.
// Usage: npm run db:migrate (local Docker stack; on Vercel production the project database, previews skip).
import "./load-local-env.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./connect.ts";
import { MIGRATION_LOCK_KEY, migrationDecision } from "./deploy-guard.ts";
import { pendingMigrations } from "./pending.ts";

const decision = migrationDecision(process.env);
if (!decision.run) {
  console.log(`Skipping migrations. ${decision.reason}`);
  process.exit(0);
}

const dir = join(import.meta.dirname, "../../supabase/migrations");
const sql = connect();

try {
  // Two deploys at once wait for each other instead of applying the same file twice (released on disconnect).
  await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
  // Keep the bookkeeping table out of the public REST API.
  await sql`alter table _migrations enable row level security`;
  const applied = (await sql<{ name: string }[]>`select name from _migrations`).map((r) => r.name);
  const pending = pendingMigrations(readdirSync(dir), applied);
  if (!pending.length) console.log("No pending migrations.");
  for (const file of pending) {
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`insert into _migrations (name) values (${file})`;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end();
}
