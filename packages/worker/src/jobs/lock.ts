import type { Sql } from "postgres";

export interface LockStore {
  /** Takes the lease when free or expired; false when another holder owns it. */
  acquire(name: string, holder: string, ttlMs: number): Promise<boolean>;
  release(name: string, holder: string): Promise<void>;
}

export type LockResult<T> = { ran: true; value: T } | { ran: false };

/** Runs `fn` only while holding the lease, so the VPS worker and the Vercel cron never overlap. */
export async function withJobLock<T>(
  store: LockStore,
  name: string,
  holder: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<LockResult<T>> {
  if (!(await store.acquire(name, holder, ttlMs))) return { ran: false };
  try {
    return { ran: true, value: await fn() };
  } finally {
    await store.release(name, holder);
  }
}

/** Lease rows in `job_locks` (migration 0018). */
export function createPostgresLockStore(sql: Sql): LockStore {
  return {
    async acquire(name, holder, ttlMs) {
      const rows = await sql`
        insert into job_locks (name, holder, locked_until)
        values (${name}, ${holder}, now() + ${ttlMs} * interval '1 millisecond')
        on conflict (name) do update
          set holder = excluded.holder, locked_until = excluded.locked_until
          where job_locks.locked_until <= now()
        returning name`;
      return rows.length === 1;
    },
    async release(name, holder) {
      await sql`update job_locks set locked_until = now() where name = ${name} and holder = ${holder}`;
    },
  };
}
