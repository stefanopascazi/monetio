-- Execution date of bank movements (#133): banks book card payments days after they are made. booked_on
-- keeps the day the payment was made (history, charts); bank_booked_on keeps the bank's booking day.
alter table transactions add column bank_booked_on date;

-- Pending outflows seen by earlier syncs ({ offsetCents, entries: [{ on, amountCents }] }), written by
-- the worker only: the booked movement takes the day its outflow was first seen.
alter table bank_accounts add column pending_ledger jsonb check (pending_ledger is null or jsonb_typeof(pending_ledger) = 'object');
