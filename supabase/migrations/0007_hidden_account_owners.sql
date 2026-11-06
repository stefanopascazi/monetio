-- Owner of each household account the caller cannot see, so shared views can say
-- "Conto privato di Asha" instead of a generic label. Balance and name stay hidden.
create or replace function hidden_account_owners() returns table (id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select a.id, coalesce(o.display_name, '') from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  left join household_members o on o.id = a.owner_member_id
  where a.visibility = 'private' and a.owner_member_id is distinct from me.id
$$;

revoke execute on function hidden_account_owners from anon;
