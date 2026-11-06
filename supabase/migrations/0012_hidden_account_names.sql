-- Transfer destinations must be told apart when a member owns several private accounts:
-- expose the account name (never its balance or movements) to the other household members.
drop function if exists hidden_account_owners(uuid);
create function hidden_account_owners(p_household uuid) returns table (id uuid, owner_name text, archived boolean, account_name text)
language sql stable security definer set search_path = public as $$
  select a.id, coalesce(o.display_name, ''), a.archived_at is not null, a.name from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  left join household_members o on o.id = a.owner_member_id
  where a.household_id = p_household and a.visibility = 'private' and a.owner_member_id is distinct from me.id
  order by a.created_at
$$;
revoke execute on function hidden_account_owners from anon;
