// admin_backups and backup requests (migration 0045) against a real database, in rolled-back transactions.
// Run on the local stack: npm run test:db. Skipped everywhere else (see localTestDbUrl).
import postgres, { type Sql, type TransactionSql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "../../scripts/db/ssl.ts";
import { localTestDbUrl } from "./local-db.ts";

const url = localTestDbUrl(process.env);
const sql: Sql | null = url ? postgres(cleanUrl(url), { ssl: sslFor(url), max: 1, onnotice: () => {} }) : null;
afterAll(async () => {
  await sql?.end();
});

class Rollback extends Error {}

/** Runs `fn` with a fresh sysadmin and a clean backup state, always rolled back. */
async function withSysadmin(fn: (tx: TransactionSql, as: (user: string) => Promise<void>, admin: string) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: admin }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'admin@example.com') returning id`;
      await tx`insert into sysadmins (user_id) values (${admin})`;
      await tx`delete from backup_objects`;
      await tx`delete from admin_job_requests where job = 'backup'`;
      const as = async (user: string) => {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user, role: "authenticated" })}, true)`;
        await tx`select set_config('request.jwt.claim.sub', ${user}, true)`;
        await tx`set local role authenticated`;
      };
      await fn(tx, as, admin);
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
}

describe.skipIf(!sql)("admin backups", () => {
  it("lists backups newest first with the pending and last on-demand request", async () => {
    await withSysadmin(async (tx, as, admin) => {
      await tx`insert into backup_objects (key, size_bytes, modified_at) values
                 ('daily/a.dump.zst.age', 10, '2026-11-23T01:00:00Z'), ('manual/b.dump.zst.age', 20, '2026-11-24T15:00:00Z')`;
      await tx`insert into admin_job_requests (job, requested_by, finished_at, result) values ('backup', ${admin}, now(), '{"key":"manual/b.dump.zst.age"}')`;
      await as(admin);
      await tx`select admin_request_job('backup')`;
      const [{ v }] = await tx`select admin_backups() as v`;
      expect(v.objects.map((o: { key: string }) => o.key)).toEqual(["manual/b.dump.zst.age", "daily/a.dump.zst.age"]);
      expect(v.pending_request).toMatchObject({ started_at: null });
      expect(v.last_request).toMatchObject({ error: null, result: { key: "manual/b.dump.zst.age" } });
      await tx`reset role`;
      const [{ n }] = await tx`select count(*)::int as n from admin_audit_log where action = 'job.request' and target = 'backup' and actor = ${admin}`;
      expect(n).toBe(1);
    });
  });

  it("refuses non-sysadmins, unknown keys and unknown jobs", async () => {
    await withSysadmin(async (tx) => {
      await expect(tx`insert into backup_objects (key, size_bytes, modified_at) values ('other/x', 1, now())`.execute()).rejects.toThrow(/check/);
    });
    await withSysadmin(async (tx, _as, admin) => {
      await expect(tx`insert into admin_job_requests (job, requested_by) values ('restore', ${admin})`.execute()).rejects.toThrow(/check/);
    });
    await withSysadmin(async (tx, as) => {
      const [{ id: user }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'utente@example.com') returning id`;
      await as(user);
      await expect(tx`select admin_backups()`.execute()).rejects.toThrow(/not a sysadmin/);
    });
  });
});
