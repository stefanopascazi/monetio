-- Some banks allow fewer reads than PSD2's four a day (#112): BCC counts balances and transactions as
-- separate reads, so only two of the four daily syncs fit. The worker learns the limit from the bank's
-- 429 and stores how many daily slots the account may use; null means all of them.
alter table bank_accounts add column sync_slots smallint check (sync_slots between 1 and 4);
grant select (sync_slots) on bank_accounts to authenticated;
