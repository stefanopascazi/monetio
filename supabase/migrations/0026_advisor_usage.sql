-- AI advisor quota (#39): questions asked today by the user and this month by the whole household.
-- Days and months follow Europe/Rome. Failed calls (error set) do not count. Counts only, no texts:
-- members cannot read each other's rows (RLS), so this runs as definer for the household total.

create or replace function advisor_usage(household uuid)
returns table (user_today integer, household_month integer)
language plpgsql stable security definer set search_path = public as $$
declare
  local_now timestamp := now() at time zone 'Europe/Rome';
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not is_household_member(household) then raise exception 'not a member' using errcode = '42501'; end if;
  return query
  select
    count(*) filter (where r.user_id = auth.uid() and r.created_at >= date_trunc('day', local_now) at time zone 'Europe/Rome')::integer,
    count(*)::integer
  from advisor_requests r
  where r.household_id = household
    and r.error is null
    and r.created_at >= date_trunc('month', local_now) at time zone 'Europe/Rome';
end $$;
revoke all on function advisor_usage(uuid) from public, anon;
grant execute on function advisor_usage(uuid) to authenticated;
