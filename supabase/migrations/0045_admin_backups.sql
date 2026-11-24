-- Backups in the sysadmin console (#105): on-demand backups queued for the worker and the list of
-- backups in off-site storage. The console sees keys, sizes and dates only; the files stay encrypted
-- and the age private key never reaches the VPS or the console.

alter table admin_job_requests drop constraint admin_job_requests_job_check;
alter table admin_job_requests add constraint admin_job_requests_job_check check (job in ('integrity-check', 'backup'));
-- Outcome written by the worker (e.g. the key of an on-demand backup).
alter table admin_job_requests add column result jsonb check (result is null or pg_column_size(result) <= 2048);

-- Snapshot of the backup bucket, replaced by the worker after each backup and every hour.
create table backup_objects (
  key text primary key check (key ~ '^(daily|weekly|monthly|manual)/[A-Za-z0-9._-]{1,120}$'),
  size_bytes bigint not null check (size_bytes >= 0),
  modified_at timestamptz not null,
  listed_at timestamptz not null default now()
);
alter table backup_objects enable row level security;
revoke all on backup_objects from anon, authenticated;

-- Console: backups newest first, pending on-demand request and the latest finished one.
create function admin_backups() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'objects', coalesce((
      select jsonb_agg(jsonb_build_object('key', b.key, 'size_bytes', b.size_bytes, 'modified_at', b.modified_at) order by b.modified_at desc)
      from backup_objects b), '[]'::jsonb),
    'listed_at', (select max(listed_at) from backup_objects),
    'pending_request', (select jsonb_build_object('requested_at', q.requested_at, 'started_at', q.started_at)
                        from admin_job_requests q where q.job = 'backup' and q.finished_at is null),
    'last_request', (select jsonb_build_object('requested_at', q.requested_at, 'finished_at', q.finished_at, 'error', q.error, 'result', q.result)
                     from admin_job_requests q where q.job = 'backup' and q.finished_at is not null order by q.finished_at desc limit 1)
  ) into v;
  return v;
end $$;
revoke execute on function admin_backups from public, anon;
grant execute on function admin_backups to authenticated;
