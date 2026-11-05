-- Credit-card accounts (e.g. a supermarket card settled monthly from the joint account).
alter type account_type add value if not exists 'card';

-- Contributions can share spending booked on another account (the card) and in the previous month
-- (the statement of month M is settled in month M+1).
alter table contribution_rules
  add column spending_account_id uuid references accounts(id) on delete set null,
  add column spending_month_offset smallint not null default 0 check (spending_month_offset between -1 and 0);
