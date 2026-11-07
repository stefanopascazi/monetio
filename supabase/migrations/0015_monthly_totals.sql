-- Monthly totals kept up to date by a trigger, so balances and flows no longer aggregate the whole
-- transactions table on every request: reads cost the same with 2k or 200k movements.
-- The views keep their names and columns (minus the unused last_booked_on), so the app is unchanged.

create table monthly_totals (
  household_id uuid not null,
  -- No foreign keys: rows are removed by the trigger when their movements are deleted (also by cascade).
  account_id uuid not null,
  month date not null,
  category_id uuid,
  kind transaction_kind not null,
  counterpart_account_id uuid,
  total_cents bigint not null default 0,
  count int not null default 0,
  constraint monthly_totals_key unique nulls not distinct (account_id, month, category_id, kind, counterpart_account_id)
);
create index on monthly_totals (household_id, month);

alter table monthly_totals enable row level security;
create policy monthly_totals_select on monthly_totals for select using (account_id in (select visible_account_ids()));
revoke all on monthly_totals from anon;
grant select on monthly_totals to authenticated;

-- Adds (sign = 1) or removes (sign = -1) one booked movement from its monthly bucket.
create or replace function apply_monthly_total(t transactions, sign int) returns void
language plpgsql security definer set search_path = public as $$
declare
  m date := date_trunc('month', t.booked_on)::date;
begin
  if t.status <> 'booked' then return; end if;
  insert into monthly_totals (household_id, account_id, month, category_id, kind, counterpart_account_id, total_cents, count)
  values (t.household_id, t.account_id, m, t.category_id, t.kind, t.counterpart_account_id, sign * t.amount_cents, sign)
  on conflict on constraint monthly_totals_key do update
    set total_cents = monthly_totals.total_cents + excluded.total_cents,
        count = monthly_totals.count + excluded.count;
  delete from monthly_totals
  where account_id = t.account_id and month = m and kind = t.kind
    and category_id is not distinct from t.category_id
    and counterpart_account_id is not distinct from t.counterpart_account_id
    and count <= 0;
end $$;
revoke execute on function apply_monthly_total from public, anon, authenticated;

create or replace function transactions_monthly_totals() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
    and old.status = new.status and old.amount_cents = new.amount_cents and old.booked_on = new.booked_on
    and old.account_id = new.account_id and old.kind = new.kind
    and old.category_id is not distinct from new.category_id
    and old.counterpart_account_id is not distinct from new.counterpart_account_id then
    return null;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then perform apply_monthly_total(old, -1); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform apply_monthly_total(new, 1); end if;
  return null;
end $$;

-- Backfill under a lock so no movement is written between the snapshot and the trigger.
lock table transactions in share row exclusive mode;
insert into monthly_totals (household_id, account_id, month, category_id, kind, counterpart_account_id, total_cents, count)
select household_id, account_id, date_trunc('month', booked_on)::date, category_id, kind, counterpart_account_id, sum(amount_cents), count(*)
from transactions where status = 'booked'
group by 1, 2, 3, 4, 5, 6;

create trigger transactions_monthly_totals
after insert or update or delete on transactions
for each row execute function transactions_monthly_totals();

-- Views now read the totals (security_invoker: the caller's RLS applies).
drop view monthly_balances;
drop view monthly_flows;
drop view account_balances;

create view monthly_flows with (security_invoker = true) as
select household_id, account_id, month, category_id, kind, counterpart_account_id, total_cents, count
from monthly_totals;

create view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.household_id,
  a.opening_balance_cents + coalesce(sum(mt.total_cents), 0) as balance_cents
from accounts a
left join monthly_totals mt on mt.account_id = a.id
group by a.id;

create view monthly_balances with (security_invoker = true) as
with months as (
  select account_id, month, sum(total_cents) as delta
  from monthly_totals group by 1, 2
)
select
  m.account_id,
  m.month,
  a.opening_balance_cents + sum(m.delta) over (partition by m.account_id order by m.month) as balance_cents,
  a.household_id
from months m
join accounts a on a.id = m.account_id;

grant select on account_balances, monthly_flows, monthly_balances to authenticated;
revoke all on account_balances, monthly_flows, monthly_balances from anon;
