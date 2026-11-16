-- Who created a recurring rule or a contribution, shown where their occurrences appear.
-- Existing rows stay unknown (null), like automatic or imported transactions.
alter table recurring_rules add column created_by uuid references auth.users(id) on delete set null;
alter table contribution_rules add column created_by uuid references auth.users(id) on delete set null;
