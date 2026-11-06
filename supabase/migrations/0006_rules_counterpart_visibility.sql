-- Transfer rules from a private account into a shared one (e.g. monthly quotas) must be visible
-- to whoever sees the counterpart, otherwise projections of the shared account miss the income.
-- Reading opens to the counterpart; writing stays with whoever sees the paying account.
drop policy if exists rules_all on recurring_rules;

create policy rules_select on recurring_rules for select
  using (can_see_account(account_id) or can_see_account(counterpart_account_id));
create policy rules_insert on recurring_rules for insert
  with check (is_household_member(household_id) and can_see_account(account_id));
create policy rules_update on recurring_rules for update
  using (can_see_account(account_id))
  with check (is_household_member(household_id) and can_see_account(account_id));
create policy rules_delete on recurring_rules for delete
  using (can_see_account(account_id));

-- Actual amounts of single occurrences follow the same split.
drop policy if exists overrides_all on rule_occurrence_overrides;

create policy overrides_select on rule_occurrence_overrides for select
  using (exists (
    select 1 from recurring_rules r
    where r.id = rule_id and (can_see_account(r.account_id) or can_see_account(r.counterpart_account_id))
  ));
create policy overrides_insert on rule_occurrence_overrides for insert
  with check (
    is_household_member(household_id)
    and exists (select 1 from recurring_rules r where r.id = rule_id and r.household_id = household_id and can_see_account(r.account_id))
  );
create policy overrides_update on rule_occurrence_overrides for update
  using (exists (select 1 from recurring_rules r where r.id = rule_id and can_see_account(r.account_id)))
  with check (
    is_household_member(household_id)
    and exists (select 1 from recurring_rules r where r.id = rule_id and r.household_id = household_id and can_see_account(r.account_id))
  );
create policy overrides_delete on rule_occurrence_overrides for delete
  using (exists (select 1 from recurring_rules r where r.id = rule_id and can_see_account(r.account_id)));
