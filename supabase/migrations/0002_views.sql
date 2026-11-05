-- Aggregates computed in SQL (PostgREST caps responses at 1000 rows).
-- security_invoker makes the views respect the caller's RLS.

create or replace view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.household_id,
  a.opening_balance_cents + coalesce(sum(t.amount_cents) filter (where t.status = 'booked'), 0) as balance_cents,
  max(t.booked_on) filter (where t.status = 'booked') as last_booked_on
from accounts a
left join transactions t on t.account_id = a.id
group by a.id;

create or replace view monthly_flows with (security_invoker = true) as
select
  t.household_id,
  t.account_id,
  date_trunc('month', t.booked_on)::date as month,
  t.category_id,
  t.kind,
  t.counterpart_account_id,
  sum(t.amount_cents) as total_cents,
  count(*)::int as count
from transactions t
where t.status = 'booked'
group by 1, 2, 3, 4, 5, 6;

-- Month-end balance history per account (for history charts).
create or replace view monthly_balances with (security_invoker = true) as
with months as (
  select account_id, month, sum(total_cents) as delta
  from monthly_flows group by 1, 2
)
select
  m.account_id,
  m.month,
  a.opening_balance_cents + sum(m.delta) over (partition by m.account_id order by m.month) as balance_cents
from months m
join accounts a on a.id = m.account_id;

-- Balance before a date, for paginated statements.
create or replace function balance_before(p_account uuid, p_date date) returns bigint
language sql stable security invoker set search_path = public as $$
  select a.opening_balance_cents + coalesce((
    select sum(amount_cents) from transactions
    where account_id = p_account and status = 'booked' and booked_on < p_date
  ), 0)
  from accounts a where a.id = p_account
$$;

grant select on account_balances, monthly_flows, monthly_balances to authenticated;
revoke all on account_balances, monthly_flows, monthly_balances from anon;
