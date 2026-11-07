-- Count and income/expense totals of a filtered movement list, so the list itself can be paged.
-- Same rules as monthlyTotals() in the app: only booked rows count, and transfers between
-- accounts the caller can see (or without a counterpart) are neither income nor expense.
-- security invoker: the caller's RLS applies, so `accounts` lists only the visible ones.
create or replace function transaction_totals(
  p_household uuid,
  p_from date default null,
  p_to date default null,
  p_account uuid default null,
  p_category uuid default null,
  p_search text default null,
  p_status transaction_status default null
) returns table (count bigint, income_cents bigint, expense_cents bigint)
language sql stable security invoker set search_path = public as $$
  with rows as (
    select t.* from transactions t
    where t.household_id = p_household
      and (p_from is null or t.booked_on >= p_from)
      and (p_to is null or t.booked_on <= p_to)
      and (p_account is null or t.account_id = p_account)
      and (p_category is null or t.category_id = p_category)
      and (p_status is null or t.status = p_status)
      and (p_search is null or t.description ilike '%' || p_search || '%')
  ),
  counted as (
    select * from rows
    where status = 'booked'
      and not (kind = 'transfer' and (counterpart_account_id is null or counterpart_account_id in (select id from accounts)))
  )
  select
    (select count(*) from rows),
    coalesce((select sum(amount_cents) from counted where amount_cents >= 0), 0)::bigint,
    coalesce((select -sum(amount_cents) from counted where amount_cents < 0), 0)::bigint
$$;
revoke execute on function transaction_totals from anon;
grant execute on function transaction_totals to authenticated;
