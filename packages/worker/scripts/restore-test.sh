#!/usr/bin/env bash
# Restore drill (#48), run monthly by GitHub Actions against a throwaway Postgres 17:
# latest daily backup -> decrypt -> decompress -> pg_restore -> sanity checks.
# Env: BACKUP_REMOTE, BACKUP_AGE_IDENTITY (age private key), RCLONE_CONFIG_R2_*,
#      PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE for the throwaway database.
set -euo pipefail

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

latest=$(rclone --config "" lsf "$BACKUP_REMOTE/daily/" | sort | tail -n 1)
[ -n "$latest" ] || { echo "no backups found in $BACKUP_REMOTE/daily/" >&2; exit 1; }
echo "latest backup: $latest"

# monetio-2026-11-10T0100Z.dump.zst.age -> must be at most 48 hours old.
stamp=${latest#monetio-}
stamp=${stamp%%.*}
taken=$(date -u -d "${stamp:0:10} ${stamp:11:2}:${stamp:13:2}" +%s)
age_hours=$(( ($(date -u +%s) - taken) / 3600 ))
echo "backup age: ${age_hours}h"
[ "$age_hours" -le 48 ] || { echo "latest backup is too old" >&2; exit 1; }

printf '%s\n' "$BACKUP_AGE_IDENTITY" > "$work/identity.txt"
rclone --config "" cat "$BACKUP_REMOTE/daily/$latest" \
  | age --decrypt --identity "$work/identity.txt" \
  | zstd -d -q -c > "$work/db.dump"
echo "dump size: $(du -h "$work/db.dump" | cut -f1)"

# Supabase roles and extensions referenced by policies and functions in the dump.
psql -v ON_ERROR_STOP=1 -q <<'SQL'
-- The dump recreates public (explicit --schema=public): drop the default one first.
drop schema public cascade;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role supabase_auth_admin nologin;
create schema extensions;
create extension pgcrypto schema extensions;
create extension "uuid-ossp" schema extensions;
SQL

pg_restore --no-owner --no-privileges --exit-on-error --dbname="$PGDATABASE" "$work/db.dump"

psql -v ON_ERROR_STOP=1 -At <<'SQL'
do $$
begin
  if (select count(*) from public._migrations) = 0 then raise exception 'restore check: no migrations'; end if;
  if (select count(*) from public.households) = 0 then raise exception 'restore check: no households'; end if;
  if (select count(*) from auth.users) = 0 then raise exception 'restore check: no users'; end if;
end $$;
select 'migrations', count(*) from public._migrations
union all select 'households', count(*) from public.households
union all select 'accounts', count(*) from public.accounts
union all select 'transactions', count(*) from public.transactions
union all select 'users', count(*) from auth.users;
SQL
echo "restore OK"
