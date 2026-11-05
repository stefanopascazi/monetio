// Pure helpers for the SQL migration runner.

/** Migration files are applied in lexical order; only `NNNN_name.sql` files count. */
export function pendingMigrations(files: string[], applied: Iterable<string>): string[] {
  const done = new Set(applied);
  return files
    .filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f))
    .sort()
    .filter((f) => !done.has(f));
}
