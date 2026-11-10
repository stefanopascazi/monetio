/**
 * Object keys for one backup. Retention is enforced by bucket lifecycle rules per prefix
 * (daily/ 7 days, weekly/ 28 days, monthly/ 180 days); Sunday and the 1st also get a copy.
 */
export interface BackupKeys {
  daily: string;
  copies: string[];
}

export const BACKUP_SUFFIX = ".dump.zst.age";

export function backupKeys(now: Date): BackupKeys {
  // 2026-11-10T01:00:12.345Z -> 2026-11-10T0100Z
  const stamp = now.toISOString().slice(0, 16).replace(":", "") + "Z";
  const file = `monetio-${stamp}${BACKUP_SUFFIX}`;
  const copies: string[] = [];
  if (now.getUTCDay() === 0) copies.push(`weekly/${file}`);
  if (now.getUTCDate() === 1) copies.push(`monthly/${file}`);
  return { daily: `daily/${file}`, copies };
}
