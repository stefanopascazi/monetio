// Deploy order guard: the worker deploys in about 2 minutes, Vercel applies migrations at the end of
// a 4-minute build. Jobs wait until the newest migration shipped with this bundle is applied.
import type { Sql } from "postgres";
import { errorMessage, type Logger } from "./logger.ts";

// Newest file in supabase/migrations, injected by build.ts (esbuild define); undefined in tests and local runs.
declare const __WORKER_SCHEMA__: string | undefined;

export const REQUIRED_MIGRATION: string | undefined =
  typeof __WORKER_SCHEMA__ === "string" && __WORKER_SCHEMA__ ? __WORKER_SCHEMA__ : undefined;

const SCHEMA_NOT_READY = new Set(["42P01", "42703"]); // undefined_table, undefined_column

/** Postgres error of a table or column that does not exist (yet). */
export const isSchemaNotReady = (error: unknown) => SCHEMA_NOT_READY.has(String((error as { code?: unknown } | null)?.code));

/** Newest migration file name, in apply order. */
export const latestMigration = (files: string[]) =>
  files
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .at(-1);

/**
 * Resolves true once `required` is applied (then never asks again). A failed check does not
 * block the jobs: it is logged and the run goes on.
 */
export function createSchemaGate(required: string | undefined, isApplied: (name: string) => Promise<boolean>, log: Logger): () => Promise<boolean> {
  let ready = required === undefined;
  let waiting = false;
  return async () => {
    if (ready) return true;
    try {
      ready = await isApplied(required!);
    } catch (error) {
      log("warn", "schema check failed, running jobs anyway", { migration: required, error: errorMessage(error) });
      return true;
    }
    if (ready && waiting) log("info", "schema ready", { migration: required });
    if (!ready && !waiting) log("warn", "waiting for migration, jobs paused", { migration: required });
    waiting = !ready;
    return ready;
  };
}

/** Checks the migrations table written by scripts/db/migrate.ts. */
export const migrationApplied = (sql: Sql) => async (name: string) => (await sql`select 1 from _migrations where name = ${name}`).length > 0;
