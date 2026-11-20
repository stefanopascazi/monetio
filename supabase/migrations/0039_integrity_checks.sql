-- Integrity checks (#47): nightly worker run (and on request from the console) that records data anomalies.
-- Findings carry ids, dates and counts only: no amounts, descriptions or names (console privacy rule).

-- Open and resolved anomalies, one row per (check, subject). A run refreshes last_seen_at on what it still
-- finds, inserts what is new and resolves what is gone. Service-only: RLS on, no policies, no grants.
create table integrity_anomalies (
  id bigint generated always as identity primary key,
  "check" text not null,
  subject text not null,
  household_id uuid,
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique ("check", subject)
);
create index on integrity_anomalies ("check") where resolved_at is null;
alter table integrity_anomalies enable row level security;
revoke all on integrity_anomalies from anon, authenticated;

create table integrity_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  request_id bigint,
  -- Open anomalies per check after the run, plus informational counters (legacy one-sided transfers).
  totals jsonb not null default '{}'::jsonb
);
create index on integrity_runs (started_at desc);
alter table integrity_runs enable row level security;
revoke all on integrity_runs from anon, authenticated;

-- Work the console asks the worker to do now. One pending request per job at a time.
create table admin_job_requests (
  id bigint generated always as identity primary key,
  job text not null check (job in ('integrity-check')),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text check (length(error) <= 300)
);
create unique index admin_job_requests_one_pending on admin_job_requests (job) where finished_at is null;
alter table admin_job_requests enable row level security;
revoke all on admin_job_requests from anon, authenticated;

-- Spreadsheet import (scripts/import): import_ref set, no batch. Its one-sided transfers are known history.
create function is_legacy_import(t transactions) returns boolean
language sql immutable as $$
  select t.source = 'import' and t.import_ref is not null and t.import_batch_id is null
$$;

-- Every current finding. Fee rows (parent_transaction_id) are part of their parent and never checked alone.
create function integrity_findings()
returns table ("check" text, subject text, household_id uuid, details jsonb)
language sql stable security definer set search_path = public as $$
  -- A rule or contribution booked twice in the same month on the same account (weekly rules excluded).
  select 'rule_double_booking', concat('rule:', t.recurring_rule_id, ':', t.account_id, ':', to_char(date_trunc('month', t.occurrence_date), 'YYYY-MM')),
         t.household_id,
         jsonb_build_object('rule_id', t.recurring_rule_id, 'rule_type', 'recurring', 'account_id', t.account_id,
                            'month', to_char(date_trunc('month', t.occurrence_date), 'YYYY-MM'),
                            'transaction_ids', jsonb_agg(t.id order by t.occurrence_date))
  from transactions t join recurring_rules r on r.id = t.recurring_rule_id
  where t.parent_transaction_id is null and r.frequency <> 'weekly' and t.occurrence_date is not null
  group by t.household_id, t.recurring_rule_id, t.account_id, date_trunc('month', t.occurrence_date)
  having count(*) > 1
  union all
  select 'rule_double_booking', concat('contribution:', t.contribution_rule_id, ':', t.account_id, ':', to_char(date_trunc('month', t.occurrence_date), 'YYYY-MM')),
         t.household_id,
         jsonb_build_object('rule_id', t.contribution_rule_id, 'rule_type', 'contribution', 'account_id', t.account_id,
                            'month', to_char(date_trunc('month', t.occurrence_date), 'YYYY-MM'),
                            'transaction_ids', jsonb_agg(t.id order by t.occurrence_date))
  from transactions t
  where t.parent_transaction_id is null and t.contribution_rule_id is not null and t.occurrence_date is not null
  group by t.household_id, t.contribution_rule_id, t.account_id, date_trunc('month', t.occurrence_date)
  having count(*) > 1
  union all
  -- One-sided transfer whose other side exists but is not linked (same date, opposite amount, crossed accounts).
  select distinct on (least(a.id, b.id)) 'transfer_unlinked', concat(least(a.id, b.id), ':', greatest(a.id, b.id)), a.household_id,
         jsonb_build_object('transaction_ids', jsonb_build_array(least(a.id, b.id), greatest(a.id, b.id)),
                            'account_ids', jsonb_build_array(a.account_id, b.account_id), 'booked_on', a.booked_on)
  from transactions a
  join transactions b on b.account_id = a.counterpart_account_id and b.counterpart_account_id = a.account_id
    and b.amount_cents = -a.amount_cents and b.booked_on = a.booked_on and b.kind = 'transfer'
    and b.transfer_group_id is null and b.parent_transaction_id is null and b.id <> a.id
  where a.kind = 'transfer' and a.transfer_group_id is null and a.parent_transaction_id is null
  union all
  -- One-sided transfer with no other side anywhere (spreadsheet history is counted apart, see integrity_totals).
  select 'transfer_missing_side', a.id::text, a.household_id,
         jsonb_build_object('transaction_id', a.id, 'account_id', a.account_id, 'counterpart_account_id', a.counterpart_account_id,
                            'booked_on', a.booked_on, 'status', a.status, 'source', a.source)
  from transactions a
  where a.kind = 'transfer' and a.transfer_group_id is null and a.parent_transaction_id is null and not is_legacy_import(a)
    and not exists (
      select 1 from transactions b
      where b.account_id = a.counterpart_account_id and b.counterpart_account_id = a.account_id
        and b.amount_cents = -a.amount_cents and b.booked_on = a.booked_on and b.kind = 'transfer'
        and b.transfer_group_id is null and b.parent_transaction_id is null and b.id <> a.id)
  union all
  -- Linked transfer whose sides disagree, or a group without exactly two sides.
  select 'transfer_mismatch', g.transfer_group_id::text, min(g.household_id::text)::uuid,
         jsonb_build_object('transfer_group_id', g.transfer_group_id, 'transaction_ids', jsonb_agg(g.id order by g.id), 'sides', count(*))
  from transactions g
  where g.transfer_group_id is not null and g.parent_transaction_id is null
  group by g.transfer_group_id
  having count(*) <> 2
      or sum(g.amount_cents) <> 0
      or count(distinct g.booked_on) > 1
      or count(distinct g.status) > 1
      or bool_or(g.counterpart_account_id is null)
      or count(distinct g.account_id) <> 2
      or bool_or(not exists (
           select 1 from transactions o where o.transfer_group_id = g.transfer_group_id and o.id <> g.id
             and o.parent_transaction_id is null and o.account_id = g.counterpart_account_id))
  union all
  -- Movements that lost their anchor.
  select 'orphan_movement', t.id::text, t.household_id,
         jsonb_build_object('transaction_id', t.id, 'account_id', t.account_id, 'booked_on', t.booked_on, 'reason',
           case
             when a.household_id <> t.household_id then 'account_other_household'
             when c.household_id <> t.household_id then 'category_other_household'
             when t.status = 'planned' and t.source = 'rule' and t.recurring_rule_id is null then 'planned_rule_deleted'
             when t.status = 'planned' and t.source = 'contribution' and t.contribution_rule_id is null then 'planned_contribution_deleted'
             else 'planned_on_archived_account'
           end)
  from transactions t
  join accounts a on a.id = t.account_id
  left join categories c on c.id = t.category_id
  where t.parent_transaction_id is null and (
       a.household_id <> t.household_id
    or c.household_id <> t.household_id
    or (t.status = 'planned' and t.source = 'rule' and t.recurring_rule_id is null)
    or (t.status = 'planned' and t.source = 'contribution' and t.contribution_rule_id is null)
    or (t.status = 'planned' and a.archived_at is not null))
  union all
  -- Households nobody can administer.
  select 'household_without_admin', h.id::text, h.id,
         jsonb_build_object('members', (select count(*) from household_members m where m.household_id = h.id),
                            'linked_members', (select count(*) from household_members m where m.household_id = h.id and m.user_id is not null))
  from households h
  where not exists (select 1 from household_members m where m.household_id = h.id and m.role = 'admin' and m.user_id is not null)
  union all
  -- Monthly totals (trigger-maintained, they feed balances) that differ from the booked movements.
  select 'balance_drift', concat(d.account_id, ':', to_char(d.month, 'YYYY-MM')), max(d.household_id::text)::uuid,
         jsonb_build_object('account_id', d.account_id, 'month', to_char(d.month, 'YYYY-MM'), 'buckets', count(*))
  from (
    select coalesce(c.household_id, m.household_id) household_id, coalesce(c.account_id, m.account_id) account_id, coalesce(c.month, m.month) as month
    from (
      select household_id, account_id, date_trunc('month', booked_on)::date as month, category_id, kind, counterpart_account_id,
             sum(amount_cents) total, count(*) n
      from transactions where status = 'booked'
      group by 1, 2, 3, 4, 5, 6
    ) c
    full join monthly_totals m on m.account_id = c.account_id and m.month = c.month and m.kind = c.kind
      and m.category_id is not distinct from c.category_id and m.counterpart_account_id is not distinct from c.counterpart_account_id
    where c.total is distinct from m.total_cents or c.n is distinct from m.count
  ) d
  group by d.account_id, d.month;
$$;
revoke execute on function integrity_findings from public, anon, authenticated;

-- Runs the checks and reconciles integrity_anomalies; returns the run's totals. Called by the worker.
create function run_integrity_checks(p_request bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run bigint;
  v_totals jsonb;
begin
  insert into integrity_runs (request_id) values (p_request) returning id into v_run;
  -- Dropped at the end too: two runs in one transaction (tests) must not collide.
  drop table if exists _findings;
  create temporary table _findings on commit drop as select * from integrity_findings();

  insert into integrity_anomalies ("check", subject, household_id, details)
  select f."check", f.subject, f.household_id, f.details from _findings f
  on conflict ("check", subject) do update
    set details = excluded.details, household_id = excluded.household_id, last_seen_at = now(),
        -- A finding back after a fix opens again with a fresh first_seen_at.
        first_seen_at = case when integrity_anomalies.resolved_at is null then integrity_anomalies.first_seen_at else now() end,
        resolved_at = null;

  update integrity_anomalies a set resolved_at = now()
  where a.resolved_at is null
    and not exists (select 1 from _findings f where f."check" = a."check" and f.subject = a.subject);

  select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) || jsonb_build_object(
           'legacy_one_sided_transfers', (
             select count(*) from transactions t
             where t.kind = 'transfer' and t.transfer_group_id is null and t.parent_transaction_id is null and is_legacy_import(t)
               and not exists (
                 select 1 from transactions b
                 where b.account_id = t.counterpart_account_id and b.counterpart_account_id = t.account_id
                   and b.amount_cents = -t.amount_cents and b.booked_on = t.booked_on and b.kind = 'transfer'
                   and b.transfer_group_id is null and b.parent_transaction_id is null and b.id <> t.id)))
  into v_totals
  from (select "check" as c, count(*) as n from _findings group by "check") s;

  update integrity_runs set finished_at = clock_timestamp(), totals = v_totals where id = v_run;
  drop table _findings;
  return v_totals;
end $$;
revoke execute on function run_integrity_checks from public, anon, authenticated;

-- Console: latest run, pending request and open anomalies (metadata only).
create function admin_integrity() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'last_run', (select jsonb_build_object('started_at', r.started_at, 'finished_at', r.finished_at, 'totals', r.totals)
                 from integrity_runs r where r.finished_at is not null order by r.started_at desc limit 1),
    'pending_request', (select jsonb_build_object('requested_at', q.requested_at, 'started_at', q.started_at)
                        from admin_job_requests q where q.job = 'integrity-check' and q.finished_at is null),
    'last_request_error', (select q.error from admin_job_requests q
                           where q.job = 'integrity-check' and q.finished_at is not null order by q.finished_at desc limit 1),
    'anomalies', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'check', a."check", 'household_id', a.household_id, 'details', a.details,
                                          'first_seen_at', a.first_seen_at, 'last_seen_at', a.last_seen_at)
                       order by a."check", a.first_seen_at)
      from (select * from integrity_anomalies where resolved_at is null order by first_seen_at limit 500) a), '[]'::jsonb),
    'open_total', (select count(*) from integrity_anomalies where resolved_at is null)
  ) into v;
  return v;
end $$;
revoke execute on function admin_integrity from public, anon;
grant execute on function admin_integrity to authenticated;

-- Console: asks the worker to run a job now. Idempotent while a request is pending; audit-logged.
create function admin_request_job(p_job text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  select id into v_id from admin_job_requests where job = p_job and finished_at is null;
  if v_id is not null then return v_id; end if;
  insert into admin_job_requests (job, requested_by) values (p_job, auth.uid()) returning id into v_id;
  perform admin_log('job.request', p_job, jsonb_build_object('request_id', v_id));
  return v_id;
end $$;
revoke execute on function admin_request_job from public, anon;
grant execute on function admin_request_job to authenticated;
