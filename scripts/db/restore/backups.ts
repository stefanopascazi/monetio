// Pure helpers to list and pick backups stored by the worker's backup job (daily/, weekly/, monthly/, ...).

export interface BackupEntry {
  /** Object key relative to the remote, e.g. "daily/monetio-2026-11-10T0100Z.dump.zst.age". */
  key: string;
  takenAt: Date;
}

const KEY = /^(?:[a-z]+\/)?monetio-(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})Z\.dump\.zst\.age$/;

/** Parses `rclone lsf -R --files-only` output; newest first, daily/ before its weekly/monthly copies. */
export function parseBackupListing(listing: string): BackupEntry[] {
  const entries: BackupEntry[] = [];
  for (const line of listing.split(/\r?\n/)) {
    const key = line.trim();
    const m = KEY.exec(key);
    if (m) entries.push({ key, takenAt: new Date(`${m[1]}T${m[2]}:${m[3]}:00Z`) });
  }
  const rank = (key: string) => (key.startsWith("daily/") ? 0 : 1);
  return entries.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime() || rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
}

/** Selector: "latest", a day (YYYY-MM-DD, latest backup of that UTC day) or an exact key. */
export function pickBackup(entries: BackupEntry[], selector: string): BackupEntry {
  if (!entries.length) throw new Error("Nessun backup trovato nello storage");
  if (selector === "latest") return entries[0];
  const found = /^\d{4}-\d{2}-\d{2}$/.test(selector)
    ? entries.find((e) => e.takenAt.toISOString().startsWith(selector))
    : entries.find((e) => e.key === selector);
  if (!found) throw new Error(`Backup "${selector}" non trovato: usa --list per vedere quelli disponibili`);
  return found;
}

export function backupAgeHours(entry: BackupEntry, now: Date): number {
  return Math.floor((now.getTime() - entry.takenAt.getTime()) / 3_600_000);
}
