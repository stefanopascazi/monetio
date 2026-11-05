-- Actual amount and due date of a single occurrence of a recurring rule, known before paying
-- (e.g. a bill arrives: 87,40 € due on 12/12 instead of the 100 € estimate on the 15th).
create table rule_occurrence_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  rule_id uuid not null references recurring_rules(id) on delete cascade,
  -- Occurrence period: `YYYY-MM` for month-based rules, the date for weekly ones.
  period text not null,
  -- Signed from the point of view of the rule's account.
  amount_cents bigint not null,
  due_date date not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (rule_id, period)
);

alter table rule_occurrence_overrides enable row level security;

create policy overrides_all on rule_occurrence_overrides for all
  using (exists (select 1 from recurring_rules r where r.id = rule_id and can_see_account(r.account_id)))
  with check (
    is_household_member(household_id)
    and exists (select 1 from recurring_rules r where r.id = rule_id and r.household_id = household_id and can_see_account(r.account_id))
  );
