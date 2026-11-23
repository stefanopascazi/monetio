# Database restore (#108)

The worker backs up `public` and `auth` every night (#48): `pg_dump | zstd | age`, uploaded to R2
(`daily/` 7 days, `weekly/` 28, `monthly/` 180). `npm run db:restore` restores one of those backups
into a Supabase database, either a new project or the current one.

## What it does

1. Downloads the backup, then decrypts and decompresses it into a private temp folder (deleted afterwards).
2. Reads the backup's `_migrations` and replays exactly those migrations on the target. The dump has no
   privileges (`--no-privileges`), so grants, RLS and functions come from the migrations, as on a fresh project.
3. Swaps the rows of `public` and `auth` in one transaction with triggers off, so no audit rows or
   transfer mirrors are created. `auth.schema_migrations` belongs to the target's GoTrue and is left alone.
4. Applies the migrations newer than the backup.
5. Checks row counts and reads a household as one of its members, through grants and RLS.

A non-empty target is refused unless you pass `--reset`, which drops everything in `public` but keeps
the schema and Supabase's default privileges. Before writing, the script shows the target host and asks
you to type it.

## Requirements

- The `age` private key, from the password manager.
- An R2 token with read access to the bucket: `BACKUP_REMOTE` plus `RCLONE_CONFIG_R2_*`, as in
  `packages/worker/deploy/worker.env.example`.
- An up-to-date checkout of `main`: it must contain every migration listed in the backup.
- Tools: Node 24, `pg_restore` and `psql` 17, `age`, `zstd`, `rclone`. On Windows use Docker (below).

## Command

```
npm run db:restore -- --list
npm run db:restore -- --backup <latest|YYYY-MM-DD|key> [--identity <file>] [--reset] [--yes]
npm run db:restore -- --file <path.dump.zst.age|.dump.zst|.dump> [--identity <file>] [--reset] [--yes]
```

- Target: `RESTORE_TARGET_URL`, or `POSTGRES_URL_NON_POOLING` (local stack by default). Use the direct
  connection (port 5432), not the pooler.
- Key: `--identity <file>` or `BACKUP_AGE_IDENTITY` (the key itself, used by CI).
- `--max-age-hours <n>`: fails if the chosen backup is older (used by the monthly drill).
- `--yes`: skips the confirmation. Only for automation.

### With Docker (Windows)

1. Create `.env.restore` in the repo root (gitignored):

   ```
   BACKUP_REMOTE=r2:monetio-backups
   RCLONE_CONFIG_R2_TYPE=s3
   RCLONE_CONFIG_R2_PROVIDER=Cloudflare
   RCLONE_CONFIG_R2_ACCESS_KEY_ID=...
   RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=...
   RCLONE_CONFIG_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
   # Optional, default is the local stack:
   # RESTORE_TARGET_URL=postgres://postgres:<password>@db.<project>.supabase.co:5432/postgres
   ```

2. Save the private key as `.restore/key.txt` (the `.restore` folder is gitignored and mounted at `/restore`).
3. Run:

   ```
   node scripts/docker/compose.ts -f docker-compose.dev.yml --profile restore run --rm --build restore --list
   node scripts/docker/compose.ts -f docker-compose.dev.yml --profile restore run --rm restore --backup latest --identity /restore/key.txt
   ```

4. Afterwards, delete `.env.restore` and `.restore/key.txt`.

To rehearse, restore into the local stack (`npm run stack:dev`) with `--reset`.

## Disaster recovery

Rows written after the backup are lost. Users keep their passwords. They may have to sign in again.

### A. The Supabase project is lost: restore into a new project

1. Create a new Supabase project in the same region. Copy its direct connection string and API keys.
2. In Authentication, set the site URL, redirect URLs and SMTP as in the old project.
3. Stop the worker on the VPS: `sudo systemctl stop monetio-worker`.
4. Restore with `RESTORE_TARGET_URL` set to the new project and `--backup latest`. The target is empty, so `--reset` is not needed.
5. Point everything at the new project:
   - Vercel: Supabase URL and keys, `POSTGRES_URL*`. Then redeploy.
   - VPS: `POSTGRES_URL_NON_POOLING` in `/etc/monetio-worker.env`.
   - Console (`monetio-admin`): Supabase URL and keys. Then redeploy.
6. Start the worker: `sudo systemctl start monetio-worker`. Sign in to the app and check your data.

### B. Data is corrupted: restore into the same project

1. Stop the worker: `sudo systemctl stop monetio-worker`.
2. Keep a copy of the current state, in case you need something from it later:

   ```
   docker run --rm -v "$PWD/.restore:/restore" -e PGPASSWORD=<password> --entrypoint pg_dump monetio-restore \
     -h db.<project>.supabase.co -U postgres -d postgres --format=custom --schema=public --schema=auth \
     --no-owner --no-privileges -f /restore/before-restore.dump
   ```

3. Restore with `--reset` and the chosen backup (`--list` shows them all).
4. Start the worker, then sign in and check your data.

## When it fails

- **The target's auth tables are missing**: the target's GoTrue is older than the one in the backup.
  A current Supabase project avoids this. Locally, update the `supabase/gotrue` image.
- **Migrations missing from the repository**: update the checkout.
- **Failure during the data load**: the load transaction is rolled back, but the schema has already been
  rebuilt. Fix the cause and run the restore again with `--reset`.

## Monthly drill

`.github/workflows/backup-restore-test.yml` (day 3 of each month, or run by hand) starts Postgres and GoTrue
from `docker-compose.dev.yml` and runs the same command with `--backup latest --max-age-hours 48 --yes`.
