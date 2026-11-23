// Pure helper: the psql script that swaps the target's rows for the backup's in one transaction.

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

export function qualified(schema: string, table: string): string {
  return `${ident(schema)}.${ident(table)}`;
}

/**
 * session_replication_role = replica skips triggers and foreign-key checks: rows go back exactly as dumped
 * (no audit rows, no transfer mirrors created twice) and tables load in any order.
 * DELETE instead of TRUNCATE: on Supabase the postgres role may lack TRUNCATE on auth tables.
 */
export function loadScript(clearTables: string[], dataFile: string): string {
  const path = dataFile.replace(/\\/g, "/").replace(/'/g, "''");
  return [
    "\\set ON_ERROR_STOP on",
    "begin;",
    "set local session_replication_role = replica;",
    ...clearTables.map((t) => `delete from ${t};`),
    `\\i '${path}'`,
    "commit;",
    "",
  ].join("\n");
}
