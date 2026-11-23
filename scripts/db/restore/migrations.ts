// Pure helpers: which migrations rebuild the backup's schema, and which ones bring it up to date afterwards.
import { pendingMigrations } from "../pending.ts";

/** Names from `pg_restore --data-only --table=_migrations -f -`: tab-separated COPY rows until "\.". */
export function parseMigrationRows(sql: string): string[] {
  const names: string[] = [];
  let inCopy = false;
  for (const line of sql.split(/\r?\n/)) {
    if (!inCopy) {
      inCopy = /^COPY public\._migrations \(name\b/.test(line);
      continue;
    }
    if (line === "\\.") break;
    names.push(line.split("\t")[0]);
  }
  return names;
}

export interface MigrationPlan {
  /** Applied before loading data: the schema exactly as it was when the backup was taken. */
  before: string[];
  /** Applied after loading data: migrations newer than the backup. */
  after: string[];
}

export function planMigrations(repoFiles: string[], backupApplied: string[]): MigrationPlan {
  if (!backupApplied.length) throw new Error("Il backup non contiene migration applicate: non è un backup di MonetIO?");
  const repo = new Set(repoFiles);
  const missing = backupApplied.filter((m) => !repo.has(m));
  if (missing.length) throw new Error(`Migration del backup assenti nel repository: ${missing.join(", ")}. Usa un checkout aggiornato.`);
  return { before: [...backupApplied].sort(), after: pendingMigrations(repoFiles, backupApplied) };
}
