// Backups in off-site storage as `rclone lsjson` reports them, for the sysadmin console (#105).
import type { Sql } from "postgres";

export interface BackupObject {
  key: string;
  sizeBytes: number;
  modifiedAt: Date;
}

/** Same rule as backup_objects.key (migration 0045): known prefixes only, anything else is skipped. */
const KEY = /^(daily|weekly|monthly|manual)\/[A-Za-z0-9._-]{1,120}$/;

/** Parses `rclone lsjson -R --files-only <remote>`. */
export function parseListing(json: string): BackupObject[] {
  const rows = JSON.parse(json) as { Path?: unknown; Size?: unknown; ModTime?: unknown }[];
  return rows.flatMap((r) => {
    const modifiedAt = new Date(String(r.ModTime));
    if (typeof r.Path !== "string" || !KEY.test(r.Path) || typeof r.Size !== "number" || r.Size < 0 || Number.isNaN(modifiedAt.getTime())) return [];
    return [{ key: r.Path, sizeBytes: r.Size, modifiedAt }];
  });
}

export type ListBackups = () => Promise<BackupObject[]>;
export type Capture = (cmd: string, args: string[]) => Promise<string>;

/** Lists the bucket with rclone (remote from RCLONE_CONFIG_* env, no config file). */
export function rcloneLister(remote: string, capture: Capture): ListBackups {
  return async () => parseListing(await capture("rclone", ["--config", "", "lsjson", "-R", "--files-only", remote]));
}

export interface BackupStore {
  /** Replaces the stored snapshot of the bucket. */
  replaceObjects(objects: BackupObject[]): Promise<void>;
  hasPendingRequest(): Promise<boolean>;
  /** Marks the pending console request as started; null when there is none. */
  claimRequest(): Promise<number | null>;
  finishRequest(id: number, error: string | null, result: Record<string, unknown> | null): Promise<void>;
}

/** backup_objects and admin_job_requests (migrations 0039, 0045). */
export function createPostgresBackupStore(sql: Sql): BackupStore {
  return {
    async replaceObjects(objects) {
      await sql.begin(async (tx) => {
        await tx`delete from backup_objects`;
        if (!objects.length) return;
        const rows = objects.map((o) => ({ key: o.key, size_bytes: o.sizeBytes, modified_at: o.modifiedAt }));
        await tx`insert into backup_objects ${tx(rows, "key", "size_bytes", "modified_at")}`;
      });
    },
    async hasPendingRequest() {
      const rows = await sql`select 1 from admin_job_requests where job = 'backup' and finished_at is null`;
      return rows.length > 0;
    },
    async claimRequest() {
      const [row] = await sql<{ id: string }[]>`
        update admin_job_requests set started_at = now()
        where job = 'backup' and finished_at is null
        returning id`;
      return row ? Number(row.id) : null;
    },
    async finishRequest(id, error, result) {
      await sql`
        update admin_job_requests set finished_at = now(), error = ${error?.slice(0, 300) ?? null}, result = ${result ? sql.json(result as never) : null}
        where id = ${id}`;
    },
  };
}
