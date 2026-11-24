// Machine-readable outcome of db:restore (--report), read by the sysadmin console from the
// GitHub Actions log (#105). One line, metadata only: keys, migration names and row counts.

export const REPORT_MARKER = "RESTORE_REPORT ";

export interface RestoreReport {
  ok: boolean;
  backup: string | null;
  /** Latest migration in the backup and how many were applied after it. */
  lastMigration: string | null;
  migrationsAfter: number | null;
  counts: Record<string, number> | null;
  /** Whether a member read their household through RLS (null: not tried). */
  memberCheck: boolean | null;
  error: string | null;
}

export const emptyReport = (): RestoreReport => ({ ok: false, backup: null, lastMigration: null, migrationsAfter: null, counts: null, memberCheck: null, error: null });

export function reportLine(report: RestoreReport): string {
  return REPORT_MARKER + JSON.stringify({ ...report, error: report.error?.slice(0, 500) ?? null });
}
