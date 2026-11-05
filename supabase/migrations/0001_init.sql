-- MonetIO core schema: households, members, accounts, categories, transactions,
-- recurring rules, contribution rules and an audit trail for transactions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type member_role as enum ('owner', 'member');
create type account_type as enum ('checking', 'savings', 'investment', 'cash');
create type account_visibility as enum ('shared', 'private');
create type category_kind as enum ('income', 'expense', 'both');
create type transaction_kind as enum ('income', 'expense', 'transfer', 'adjustment');
create type transaction_status as enum ('booked', 'planned');
create type transaction_source as enum ('manual', 'import', 'rule', 'contribution');
create type rule_frequency as enum ('weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly');
-- auto: booked automatically on its date; due: shows as a deadline to mark as paid;
-- estimate: only feeds projections (e.g. monthly grocery budget).
create type rule_schedule as enum ('auto', 'due', 'estimate');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index on household_members (user_id);
create index on household_members (lower(email));

create table accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  institution text,
  type account_type not null default 'checking',
  visibility account_visibility not null default 'shared',
  owner_member_id uuid references household_members(id) on delete set null,
  opening_balance_cents bigint not null default 0,
  opening_date date not null default current_date,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint private_needs_owner check (visibility = 'shared' or owner_member_id is not null)
);
create index on accounts (household_id);

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind category_kind not null default 'expense',
  icon text,
  color_index smallint not null default 1 check (color_index between 1 and 6),
  archived_at timestamptz,
  unique (household_id, name)
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  counterpart_account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  kind transaction_kind not null check (kind in ('income', 'expense', 'transfer')),
  description text not null,
  -- Signed from the point of view of account_id (negative = money out).
  amount_cents bigint not null,
  frequency rule_frequency not null default 'monthly',
  schedule rule_schedule not null default 'auto',
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint transfer_needs_counterpart check (kind <> 'transfer' or counterpart_account_id is not null)
);
create index on recurring_rules (household_id);

-- Periodic transfer into a shared account: fixed part + a share of the spending
-- booked on the target account in the given categories during the same month.
create table contribution_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  from_account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid not null references accounts(id) on delete cascade,
  description text not null,
  fixed_cents bigint not null default 0 check (fixed_cents >= 0),
  share_percent numeric(5,2) not null default 0 check (share_percent between 0 and 100),
  category_ids uuid[] not null default '{}',
  -- The variable part is rounded up to this step (spreadsheet used CEILING(x, 10)).
  rounding_cents int not null default 1000 check (rounding_cents > 0),
  day_of_month smallint not null default 28 check (day_of_month between 1 and 31),
  -- Monthly estimate of the shared spending, used for future projections.
  estimated_spending_cents bigint not null default 0,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on contribution_rules (household_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  counterpart_account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  kind transaction_kind not null,
  status transaction_status not null default 'booked',
  source transaction_source not null default 'manual',
  -- Signed from the point of view of account_id (negative = money out).
  amount_cents bigint not null,
  booked_on date not null,
  description text not null,
  notes text,
  transfer_group_id uuid,
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  contribution_rule_id uuid references contribution_rules(id) on delete set null,
  occurrence_date date,
  import_ref text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on transactions (account_id, booked_on);
create index on transactions (household_id, booked_on);
create index on transactions (transfer_group_id);
-- One booked occurrence per rule/date and per account (transfers create two rows).
create unique index transactions_rule_occurrence on transactions (recurring_rule_id, occurrence_date, account_id)
  where recurring_rule_id is not null;
create unique index transactions_contribution_occurrence on transactions (contribution_rule_id, occurrence_date, account_id)
  where contribution_rule_id is not null;

-- Every update/delete of a transaction keeps the previous version.
create table transaction_audit (
  id bigserial primary key,
  transaction_id uuid not null,
  household_id uuid not null,
  action text not null check (action in ('update', 'delete')),
  previous jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index on transaction_audit (transaction_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function audit_transaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into transaction_audit (transaction_id, household_id, action, previous, changed_by)
  values (old.id, old.household_id, lower(tg_op), to_jsonb(old), auth.uid());
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    return new;
  end if;
  return old;
end $$;

create trigger transactions_audit_update before update on transactions
  for each row execute function audit_transaction();
create trigger transactions_audit_delete before delete on transactions
  for each row execute function audit_transaction();

-- ---------------------------------------------------------------------------
-- Access helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function current_member_id(hh uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from household_members where household_id = hh and user_id = auth.uid() limit 1
$$;

create or replace function is_household_member(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = hh and user_id = auth.uid())
$$;

create or replace function can_see_account(acc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from accounts a
    join household_members m on m.household_id = a.household_id and m.user_id = auth.uid()
    where a.id = acc and (a.visibility = 'shared' or a.owner_member_id = m.id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table households enable row level security;
alter table household_members enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table recurring_rules enable row level security;
alter table contribution_rules enable row level security;
alter table transactions enable row level security;
alter table transaction_audit enable row level security;

create policy households_select on households for select using (is_household_member(id));
create policy households_update on households for update using (is_household_member(id));

create policy members_select on household_members for select using (is_household_member(household_id));
create policy members_insert on household_members for insert with check (is_household_member(household_id));
create policy members_update on household_members for update using (is_household_member(household_id));

create policy accounts_select on accounts for select using (can_see_account(id));
create policy accounts_insert on accounts for insert with check (
  is_household_member(household_id)
  and (visibility = 'shared' or owner_member_id = current_member_id(household_id))
);
create policy accounts_update on accounts for update using (can_see_account(id)) with check (
  is_household_member(household_id)
  and (visibility = 'shared' or owner_member_id = current_member_id(household_id))
);
create policy accounts_delete on accounts for delete using (can_see_account(id));

create policy categories_all on categories for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));

create policy rules_all on recurring_rules for all
  using (can_see_account(account_id)) with check (is_household_member(household_id) and can_see_account(account_id));

create policy contributions_select on contribution_rules for select
  using (can_see_account(from_account_id) or can_see_account(to_account_id));
create policy contributions_write on contribution_rules for all
  using (can_see_account(from_account_id)) with check (is_household_member(household_id) and can_see_account(from_account_id));

create policy transactions_select on transactions for select using (can_see_account(account_id));
create policy transactions_insert on transactions for insert with check (
  is_household_member(household_id)
  and (can_see_account(account_id) or (kind = 'transfer' and can_see_account(counterpart_account_id)))
);
create policy transactions_update on transactions for update using (can_see_account(account_id));
create policy transactions_delete on transactions for delete using (can_see_account(account_id));

create policy audit_select on transaction_audit for select using (is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Onboarding RPCs
-- ---------------------------------------------------------------------------

-- Links the current user to a pre-created member with the same email (e.g. from the import).
create or replace function claim_membership() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text;
  mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into mid from household_members where user_id = uid limit 1;
  if mid is not null then return mid; end if;
  select lower(email) into mail from auth.users where id = uid;
  update household_members set user_id = uid
    where id = (select id from household_members where user_id is null and lower(email) = mail limit 1)
    returning id into mid;
  return mid;
end $$;

create or replace function create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hh uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from household_members where user_id = uid) then
    raise exception 'already in a household';
  end if;
  insert into households (name) values (p_name) returning id into hh;
  insert into household_members (household_id, user_id, display_name, email, role)
    values (hh, uid, p_display_name, (select email from auth.users where id = uid), 'owner');
  return hh;
end $$;

-- Joins by invite code; takes over an unclaimed member when p_member_id is given.
create or replace function join_household(p_code text, p_display_name text, p_member_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hh uuid;
  mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from household_members where user_id = uid) then
    raise exception 'already in a household';
  end if;
  select id into hh from households where invite_code = upper(trim(p_code));
  if hh is null then raise exception 'invalid invite code'; end if;
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

-- Unclaimed members of a household, visible to someone holding its invite code.
create or replace function unclaimed_members(p_code text) returns table (id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select m.id, m.display_name from household_members m
  join households h on h.id = m.household_id
  where h.invite_code = upper(trim(p_code)) and m.user_id is null
$$;

revoke execute on function claim_membership, create_household, join_household, unclaimed_members from anon;
