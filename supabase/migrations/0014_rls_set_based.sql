-- Row level security evaluated once per query instead of once per row.
-- can_see_account()/is_household_member() are security definer functions, which Postgres never
-- inlines: as row filters they ran a lookup for every scanned row. Set-returning helpers inside
-- `x in (select ...)` become a single hashed subplan. Write checks (one row each) stay as they are.

create or replace function my_household_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from household_members where user_id = auth.uid()
$$;

create or replace function visible_account_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.id from accounts a
  join household_members m on m.household_id = a.household_id and m.user_id = auth.uid()
  where a.visibility = 'shared' or a.owner_member_id = m.id
$$;

revoke execute on function my_household_ids, visible_account_ids from anon;
grant execute on function my_household_ids, visible_account_ids to authenticated;

-- Households and members
drop policy households_select on households;
create policy households_select on households for select using (id in (select my_household_ids()));
drop policy members_select on household_members;
create policy members_select on household_members for select using (household_id in (select my_household_ids()));

-- Accounts
drop policy accounts_select on accounts;
create policy accounts_select on accounts for select using (id in (select visible_account_ids()));
drop policy accounts_update on accounts;
create policy accounts_update on accounts for update using (id in (select visible_account_ids())) with check (
  is_household_member(household_id) and (visibility = 'shared' or owner_member_id = current_member_id(household_id))
);
drop policy accounts_delete on accounts;
create policy accounts_delete on accounts for delete using (id in (select visible_account_ids()));

-- Categories
drop policy categories_all on categories;
create policy categories_all on categories for all
  using (household_id in (select my_household_ids()))
  with check (is_household_member(household_id));

-- Transactions and audit
drop policy transactions_select on transactions;
create policy transactions_select on transactions for select using (account_id in (select visible_account_ids()));
drop policy transactions_update on transactions;
create policy transactions_update on transactions for update using (account_id in (select visible_account_ids()));
drop policy transactions_delete on transactions;
create policy transactions_delete on transactions for delete using (account_id in (select visible_account_ids()));
drop policy audit_select on transaction_audit;
create policy audit_select on transaction_audit for select using (household_id in (select my_household_ids()));

-- Recurring rules
drop policy rules_select on recurring_rules;
create policy rules_select on recurring_rules for select using (
  account_id in (select visible_account_ids()) or counterpart_account_id in (select visible_account_ids())
);
drop policy rules_update on recurring_rules;
create policy rules_update on recurring_rules for update using (account_id in (select visible_account_ids())) with check (
  is_household_member(household_id) and can_see_account(account_id)
);
drop policy rules_delete on recurring_rules;
create policy rules_delete on recurring_rules for delete using (account_id in (select visible_account_ids()));

-- Contribution rules
drop policy contributions_select on contribution_rules;
create policy contributions_select on contribution_rules for select using (
  from_account_id in (select visible_account_ids()) or to_account_id in (select visible_account_ids())
);
drop policy contributions_write on contribution_rules;
create policy contributions_write on contribution_rules for all using (from_account_id in (select visible_account_ids())) with check (
  is_household_member(household_id) and can_see_account(from_account_id)
);

-- Occurrence overrides (visibility follows the rule)
drop policy overrides_select on rule_occurrence_overrides;
create policy overrides_select on rule_occurrence_overrides for select using (
  rule_id in (
    select r.id from recurring_rules r
    where r.account_id in (select visible_account_ids()) or r.counterpart_account_id in (select visible_account_ids())
  )
);
drop policy overrides_update on rule_occurrence_overrides;
create policy overrides_update on rule_occurrence_overrides for update using (
  rule_id in (select r.id from recurring_rules r where r.account_id in (select visible_account_ids()))
) with check (
  is_household_member(household_id) and exists (
    select 1 from recurring_rules r where r.id = rule_occurrence_overrides.rule_id and can_see_account(r.account_id)
  )
);
drop policy overrides_delete on rule_occurrence_overrides;
create policy overrides_delete on rule_occurrence_overrides for delete using (
  rule_id in (select r.id from recurring_rules r where r.account_id in (select visible_account_ids()))
);
