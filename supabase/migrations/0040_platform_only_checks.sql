-- Integrity checks cover the platform only (#47): what our code should have prevented.
-- One-sided or unlinked transfers are a household's own data choices (e.g. a transfer to an account not
-- tracked in MonetIO): they are not platform anomalies and the console must not look into them.

create or replace function integrity_findings()
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

create or replace function run_integrity_checks(p_request bigint default null) returns jsonb
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

  select coalesce(jsonb_object_agg(c, n), '{}'::jsonb)
  into v_totals
  from (select "check" as c, count(*) as n from _findings group by "check") s;

  update integrity_runs set finished_at = clock_timestamp(), totals = v_totals where id = v_run;
  drop table _findings;
  return v_totals;
end $$;
revoke execute on function run_integrity_checks from public, anon, authenticated;

drop function is_legacy_import(transactions);

-- Never platform anomalies: removed rather than resolved.
delete from integrity_anomalies where "check" in ('transfer_unlinked', 'transfer_missing_side');
