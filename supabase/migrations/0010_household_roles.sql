-- Household permissions: admins manage the household and its members, plain members use it.
-- A user may belong to any number of households (the active one is chosen by the app).

-- ---------------------------------------------------------------------------
-- Roles: 'owner' becomes 'admin' (several admins per household are allowed).
-- ---------------------------------------------------------------------------
alter type member_role rename value 'owner' to 'admin';

create or replace function is_household_admin(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_members where household_id = hh and user_id = auth.uid() and role = 'admin'
  )
$$;
revoke execute on function is_household_admin from anon;

-- ---------------------------------------------------------------------------
-- Policies: only admins rename/delete the household and add/edit other members.
-- Everyone can edit their own row (display name) and leave the household.
-- ---------------------------------------------------------------------------
drop policy if exists households_update on households;
create policy households_update on households for update using (is_household_admin(id));
create policy households_delete on households for delete using (is_household_admin(id));

drop policy if exists members_insert on household_members;
drop policy if exists members_update on household_members;
create policy members_insert on household_members for insert with check (is_household_admin(household_id));
create policy members_update on household_members for update
  using (is_household_admin(household_id) or user_id = auth.uid())
  with check (is_household_member(household_id));
create policy members_delete on household_members for delete
  using (is_household_admin(household_id) or user_id = auth.uid());

-- Role changes need an admin, and every household keeps at least one active admin.
-- Skipped for the service role (auth.uid() is null) and for cascades from a household delete.
create or replace function guard_household_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  losing_admin boolean;
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id then raise exception 'household cannot change'; end if;
    if new.role <> old.role and not is_household_admin(old.household_id) then
      raise exception 'only admins can change roles';
    end if;
    if new.user_id is distinct from old.user_id and not is_household_admin(old.household_id) then
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

create trigger household_members_guard before update or delete on household_members
  for each row execute function guard_household_member();

-- ---------------------------------------------------------------------------
-- Onboarding RPCs: no more single-household limit.
-- ---------------------------------------------------------------------------

-- Links every pending member with the user's email (in households the user is not in yet).
-- Returns one membership of the user, or null when there is none.
create or replace function claim_membership() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text;
  mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select lower(email) into mail from auth.users where id = uid;
  update household_members m set user_id = uid
    where m.user_id is null and lower(m.email) = mail
      and not exists (select 1 from household_members o where o.household_id = m.household_id and o.user_id = uid)
      -- One pending row per household: the oldest wins.
      and m.id = (
        select p.id from household_members p
        where p.household_id = m.household_id and p.user_id is null and lower(p.email) = mail
        order by p.created_at limit 1
      );
  select id into mid from household_members where user_id = uid order by created_at limit 1;
  return mid;
end $$;

create or replace function create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hh uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into households (name) values (p_name) returning id into hh;
  insert into household_members (household_id, user_id, display_name, email, role)
    values (hh, uid, p_display_name, (select email from auth.users where id = uid), 'admin');
  return hh;
end $$;

-- Joins by invite code as a plain member; takes over an unclaimed member when p_member_id is given.
create or replace function join_household(p_code text, p_display_name text, p_member_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hh uuid;
  mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into hh from households where invite_code = upper(trim(p_code));
  if hh is null then raise exception 'invalid invite code'; end if;
  if exists (select 1 from household_members where household_id = hh and user_id = uid) then
    raise exception 'already a member';
  end if;
  if p_member_id is not null then
    update household_members set user_id = uid, email = coalesce(email, (select email from auth.users where id = uid))
      where id = p_member_id and household_id = hh and user_id is null
      returning id into mid;
  end if;
  if mid is null then
    insert into household_members (household_id, user_id, display_name, email)
      values (hh, uid, p_display_name, (select email from auth.users where id = uid))
      returning id into mid;
  end if;
  return mid;
end $$;

-- ---------------------------------------------------------------------------
-- Household scoping for reads that had none (a user now sees several households).
-- ---------------------------------------------------------------------------
create or replace view monthly_balances with (security_invoker = true) as
with months as (
  select account_id, month, sum(total_cents) as delta
  from monthly_flows group by 1, 2
)
select
  m.account_id,
  m.month,
  a.opening_balance_cents + sum(m.delta) over (partition by m.account_id order by m.month) as balance_cents,
  a.household_id
from months m
join accounts a on a.id = m.account_id;

drop function if exists hidden_account_owners();
create function hidden_account_owners(p_household uuid) returns table (id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select a.id, coalesce(o.display_name, '') from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  left join household_members o on o.id = a.owner_member_id
  where a.household_id = p_household and a.visibility = 'private' and a.owner_member_id is distinct from me.id
$$;
revoke execute on function hidden_account_owners from anon;

-- Admins only: deletes a household with all its data. Accounts go first, otherwise the member
-- cascade could null the owner of a private account (private_needs_owner) before it is deleted.
create or replace function delete_household(p_household uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_household_admin(p_household) then raise exception 'only admins can delete the household'; end if;
  delete from accounts where household_id = p_household;
  delete from households where id = p_household;
end $$;
revoke execute on function delete_household from anon;
