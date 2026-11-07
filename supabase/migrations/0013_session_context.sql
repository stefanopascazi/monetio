-- One round trip per request for the signed-in context: links pending invitations, then returns
-- the user's member rows, their households and the members of every one of them.
-- The active household is picked in the app (cookie preference), so all members are returned.
create or replace function session_context() returns json
language plpgsql volatile security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform claim_membership();
  return json_build_object(
    'memberships', coalesce((
      select json_agg(row_to_json(m) order by m.created_at) from household_members m where m.user_id = uid
    ), '[]'::json),
    'households', coalesce((
      select json_agg(json_build_object('id', h.id, 'name', h.name, 'invite_code', h.invite_code))
      from households h where h.id in (select household_id from household_members where user_id = uid)
    ), '[]'::json),
    'members', coalesce((
      select json_agg(row_to_json(o) order by o.created_at) from household_members o
      where o.household_id in (select household_id from household_members where user_id = uid)
    ), '[]'::json)
  );
end $$;
revoke execute on function session_context from anon;
grant execute on function session_context to authenticated;
