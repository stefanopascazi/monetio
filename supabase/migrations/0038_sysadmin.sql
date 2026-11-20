-- Sysadmin console (#47): sysadmin role, audit log, worker run history and the health read model.
-- The console never gets the service-role key: it signs in as a normal user and calls the
-- security-definer functions below, which check is_sysadmin() and expose only metadata.

-- Users allowed into the console. Granted by hand (npm run admin:grant), never from the app.
create table sysadmins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table sysadmins enable row level security;
revoke all on sysadmins from anon, authenticated;

create function is_sysadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sysadmins where user_id = auth.uid());
$$;
revoke execute on function is_sysadmin from public, anon;
grant execute on function is_sysadmin to authenticated;

-- Every sysadmin action, append-only. Rows are written only through admin_log().
-- No foreign key on actor: the trail must outlive the account (the email is kept for that).
create table admin_audit_log (
  id bigint generated always as identity primary key,
  actor uuid not null,
  actor_email text,
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{1,62}$'),
  target text check (length(target) <= 200),
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 4096),
  at timestamptz not null default now()
);
create index on admin_audit_log (at desc);
alter table admin_audit_log enable row level security;
revoke all on admin_audit_log from anon, authenticated;

create function admin_log(p_action text, p_target text default null, p_details jsonb default '{}'::jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  insert into admin_audit_log (actor, actor_email, action, target, details)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_target, coalesce(p_details, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function admin_log from public, anon;
grant execute on function admin_log to authenticated;

-- One row per finished worker run (success or failure); skipped and not-due runs are not stored.
-- Kept 30 days by the job-runs-purge job. Service-only: RLS on with no policies.
create table job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  status text not null check (status in ('success', 'failed')),
  error text check (length(error) <= 300),
  holder text not null
);
create index on job_runs (job, started_at desc);
create index on job_runs (started_at);
alter table job_runs enable row level security;
revoke all on job_runs from anon, authenticated;

-- Health snapshot for the console: job runs, push delivery and PSD2 consents. No household data.
create function admin_health() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'generated_at', now(),
    'jobs', coalesce((
      select jsonb_agg(j order by j->>'job') from (
        select jsonb_build_object(
          'job', names.job,
          'last_success_at', l.last_success_at,
          'last_run', (
            select jsonb_build_object('started_at', r.started_at, 'duration_ms', r.duration_ms, 'status', r.status, 'error', r.error)
            from job_runs r where r.job = names.job order by r.started_at desc limit 1),
          'runs_24h', (select count(*) from job_runs r where r.job = names.job and r.started_at > now() - interval '24 hours'),
          'failures_24h', (select count(*) from job_runs r where r.job = names.job and r.status = 'failed' and r.started_at > now() - interval '24 hours'),
          'avg_duration_ms_24h', (select round(avg(r.duration_ms)) from job_runs r where r.job = names.job and r.started_at > now() - interval '24 hours')
        ) as j
        from (select name as job from job_locks union select distinct job from job_runs) names
        left join job_locks l on l.name = names.job
      ) s), '[]'::jsonb),
    'recent_failures', coalesce((
      select jsonb_agg(jsonb_build_object('job', f.job, 'started_at', f.started_at, 'duration_ms', f.duration_ms, 'error', f.error) order by f.started_at desc)
      from (select * from job_runs where status = 'failed' order by started_at desc limit 20) f), '[]'::jsonb),
    'push', jsonb_build_object(
      'pending_over_1h', (select count(*) from push_outbox where sent_at is null and created_at < now() - interval '1 hour'),
      'failed_attempts_7d', (select count(*) from push_outbox where attempts > 0 and created_at > now() - interval '7 days'),
      'recent_errors', coalesce((
        select jsonb_agg(jsonb_build_object('created_at', e.created_at, 'attempts', e.attempts, 'error', left(e.last_error, 160)) order by e.created_at desc)
        from (select created_at, attempts, last_error from push_outbox
              where attempts > 0 and last_error is not null order by created_at desc limit 10) e), '[]'::jsonb)
    ),
    'bank', jsonb_build_object(
      'active', (select count(*) from bank_connections where status = 'active'),
      'expired', (select count(*) from bank_connections where status = 'expired' or (status = 'active' and valid_until <= now())),
      'revoked', (select count(*) from bank_connections where status = 'revoked'),
      'expiring_14d', coalesce((
        select jsonb_agg(jsonb_build_object('aspsp', c.aspsp_name, 'valid_until', c.valid_until) order by c.valid_until)
        from bank_connections c
        where c.status = 'active' and c.valid_until > now() and c.valid_until <= now() + interval '14 days'), '[]'::jsonb),
      'account_errors', coalesce((
        select jsonb_agg(jsonb_build_object('aspsp', c.aspsp_name, 'last_synced_at', a.last_synced_at, 'error', a.last_error) order by c.aspsp_name)
        from bank_accounts a join bank_connections c on c.id = a.connection_id
        where a.last_error is not null), '[]'::jsonb)
    )
  ) into v;
  return v;
end $$;
revoke execute on function admin_health from public, anon;
grant execute on function admin_health to authenticated;
