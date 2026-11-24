/**
 * Object keys for one backup. Retention is enforced by bucket lifecycle rules per prefix
 * (daily/ 7 days, weekly/ 28 days, monthly/ 180 days); Sunday and the 1st also get a copy.
 */
export interface BackupKeys {
  daily: string;
  copies: string[];
}

export const BACKUP_SUFFIX = ".dump.zst.age";

/** 2026-11-10T01:00:12.345Z -> monetio-2026-11-10T0100Z.dump.zst.age */
const fileName = (now: Date) => `monetio-${now.toISOString().slice(0, 16).replace(":", "")}Z${BACKUP_SUFFIX}`;

export function backupKeys(now: Date): BackupKeys {
  const file = fileName(now);
  const copies: string[] = [];
  if (now.getUTCDay() === 0) copies.push(`weekly/${file}`);
  if (now.getUTCDate() === 1) copies.push(`monthly/${file}`);
  return { daily: `daily/${file}`, copies };
}

/** On-demand backup from the console (#105): its own prefix, so the daily rotation is untouched (manual/ 30 days). */
export function manualKey(now: Date): string {
  return `manual/${fileName(now)}`;
}
