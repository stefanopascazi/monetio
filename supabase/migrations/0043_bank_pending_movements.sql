-- Movements the bank lists as not booked yet (#118): card payments and holds already out of the
-- available balance. The projection matches them to what it already expects (due items, estimates)
-- so nothing is counted twice. Written by the worker; null when the bank lists none.
alter table bank_accounts add column pending_movements jsonb check (pending_movements is null or jsonb_typeof(pending_movements) = 'array');
grant select (pending_movements) on bank_accounts to authenticated;
