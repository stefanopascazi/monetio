-- Invited users link themselves to their pending member row on first sign-in (claim_membership).
-- 0010 required an admin for any user_id change, but a newcomer cannot be an admin before being
-- linked, so every first sign-in from an invite failed. Self-claim is now allowed only when the
-- row is unlinked, the new user is the caller and the row's email is the caller's email.
create or replace function guard_household_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  losing_admin boolean;
  self_claim boolean;
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id then raise exception 'household cannot change'; end if;
    self_claim := old.user_id is null
      and new.user_id = auth.uid()
      and lower(old.email) = (select lower(email) from auth.users where id = auth.uid());
    if new.role <> old.role and not is_household_admin(old.household_id) then
      raise exception 'only admins can change roles';
    end if;
    if new.user_id is distinct from old.user_id and not self_claim and not is_household_admin(old.household_id) then
      raise exception 'only admins can relink members';
    end if;
    losing_admin := old.role = 'admin' and old.user_id is not null and (new.role <> 'admin' or new.user_id is null);
  else
    losing_admin := old.role = 'admin' and old.user_id is not null;
  end if;
  if losing_admin and not exists (
    select 1 from household_members
    where household_id = old.household_id and id <> old.id and role = 'admin' and user_id is not null
  ) then
    raise exception 'last admin';
  end if;
  return coalesce(new, old);
end $$;
