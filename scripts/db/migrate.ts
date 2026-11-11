// Applies pending SQL migrations from supabase/migrations to the database.
// Usage: npm run db:migrate (local Docker stack; on Vercel the project database).
import "./load-local-env.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./connect.ts";
import { pendingMigrations } from "./pending.ts";

const dir = join(import.meta.dirname, "../../supabase/migrations");
const sql = connect();

try {
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
