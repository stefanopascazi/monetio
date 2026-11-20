-- Category matches per account (#91): "this description, in this account, goes to this category".
-- Each bank words descriptions its own way, so a match belongs to one account. Matches only come
-- from an explicit choice of the user; bank syncs and CSV imports apply them to new movements.

create table account_category_matches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  -- Normalised description without variable parts (dates, card numbers, codes): see lib/categories/matches.ts.
  description_key text not null check (description_key <> ''),
  -- Sign of the amount: a match on an expense never applies to an income with the same description.
  direction smallint not null check (direction in (-1, 1)),
  category_id uuid not null references categories(id) on delete cascade,
  -- One original description, shown to the user.
  sample_description text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, description_key, direction)
);

alter table account_category_matches enable row level security;
create policy category_matches_select on account_category_matches for select using (account_id in (select visible_account_ids()));
create policy category_matches_insert on account_category_matches for insert with check (
  is_household_member(household_id) and can_see_account(account_id)
  and exists (select 1 from accounts a where a.id = account_id and a.household_id = account_category_matches.household_id)
  and exists (select 1 from categories c where c.id = category_id and c.household_id = account_category_matches.household_id)
);
create policy category_matches_update on account_category_matches for update using (account_id in (select visible_account_ids())) with check (
  is_household_member(household_id) and can_see_account(account_id)
  and exists (select 1 from categories c where c.id = category_id and c.household_id = account_category_matches.household_id)
);
create policy category_matches_delete on account_category_matches for delete using (account_id in (select visible_account_ids()));
grant select, insert, update, delete on account_category_matches to authenticated;
