-- Current and available balance, as banks show them (#113). bank_balance_cents now holds only a booked
-- balance; the available one also counts card payments not booked yet, so the gap between the two
-- is explained to the owner instead of looking like an error. Written by the worker.
alter table bank_accounts add column bank_available_cents bigint;
grant select (bank_available_cents) on bank_accounts to authenticated;
