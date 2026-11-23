// Pure helpers over a custom-format dump: which entries to load, and SQL tweaks for older servers.

export interface DataEntry {
  /** Original `pg_restore -l` line, reused as-is in the --use-list file. */
  line: string;
  kind: "TABLE DATA" | "SEQUENCE SET";
  schema: string;
  name: string;
}

// e.g. "4100; 0 29512 TABLE DATA public accounts postgres" (owner may be missing).
const ENTRY = /^\d+; \d+ \d+ (TABLE DATA|SEQUENCE SET) (\S+) (\S+)(?: |$)/;

/**
 * GoTrue owns the auth schema structure and tracks it in auth.schema_migrations: the target keeps its own
 * copy, otherwise GoTrue would re-run (and fail on) migrations it already applied.
 */
export const SKIPPED_TABLES = ["auth.schema_migrations"];

/** Data rows and sequence positions of public and auth, minus GoTrue's bookkeeping. */
export function dataEntries(toc: string): DataEntry[] {
  const entries: DataEntry[] = [];
  for (const line of toc.split(/\r?\n/)) {
    const m = ENTRY.exec(line);
    if (!m) continue;
    const [, kind, schema, name] = m;
    if (schema !== "public" && schema !== "auth") continue;
    if (SKIPPED_TABLES.includes(`${schema}.${name}`)) continue;
    entries.push({ line, kind: kind as DataEntry["kind"], schema, name });
  }
  return entries;
}

/** `schema.table` of every table whose rows are in the dump. */
export function dumpedTables(entries: DataEntry[], schema: string): string[] {
  return entries.filter((e) => e.kind === "TABLE DATA" && e.schema === schema).map((e) => e.name);
}

/** Content of the file passed to `pg_restore --use-list`. */
export function restoreList(entries: DataEntry[]): string {
  return entries.map((e) => e.line).join("\n") + "\n";
}

/** pg_restore 17 always emits `SET transaction_timeout`, unknown to Postgres 15/16 servers. */
export function stripUnsupportedSettings(sql: string, serverMajor: number): string {
  return serverMajor >= 17 ? sql : sql.replace(/^SET transaction_timeout = .*;\r?\n/gm, "");
}
