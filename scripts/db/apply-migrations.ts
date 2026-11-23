// Shared by db:migrate and db:restore: bookkeeping table and in-order application of migration files.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sql } from "postgres";

export const MIGRATIONS_DIR = join(import.meta.dirname, "../../supabase/migrations");

export async function ensureMigrationsTable(sql: Sql) {
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
  // Keep the bookkeeping table out of the public REST API.
  await sql`alter table _migrations enable row level security`;
}

export async function appliedMigrations(sql: Sql): Promise<string[]> {
  return (await sql<{ name: string }[]>`select name from _migrations`).map((r) => r.name);
}

/** Applies each file in its own transaction, recording it in _migrations. */
export async function applyMigrations(sql: Sql, files: string[], log: (msg: string) => void = console.log) {
  for (const file of files) {
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      await tx`insert into _migrations (name) values (${file})`;
    });
    log(`Applied ${file}`);
  }
}
