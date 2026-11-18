-- Bank sync (#38): movements written by the worker, the bank's balance for comparison, and the
-- "Da rivedere" queue for movements the matcher could not settle on its own.

alter type transaction_source add value if not exists 'bank';

-- Bank reference of the movement this row stands for (new from the bank, or a recorded movement
-- reconciled with it). Unique per account: a second sync never writes the same movement again.
alter table transactions add column bank_ref text check (length(bank_ref) <= 120);
create unique index transactions_account_bank_ref on transactions (account_id, bank_ref) where bank_ref is not null;

-- Last balance reported by the bank and the outcome of the last sync of each bank account.
alter table bank_accounts
  add column bank_balance_cents bigint,
  add column bank_balance_on date,
  add column last_synced_at timestamptz,
  add column last_error text check (length(last_error) <= 300);
grant select (bank_balance_cents, bank_balance_on, last_synced_at, last_error) on bank_accounts to authenticated;

create table bank_sync_reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  bank_ref text not null check (length(bank_ref) <= 120),
  booked_on date not null,
  amount_cents bigint not null,
  description text not null check (length(description) <= 300),
  reason text not null check (reason in ('amount_differs', 'possible_duplicate', 'ambiguous')),
  -- Recorded movement the bank one probably corresponds to (null when ambiguous).
  candidate_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution in ('added', 'matched', 'ignored')),
  unique (account_id, bank_ref),
  check ((resolved_at is null) = (resolution is null))
);
create index on bank_sync_reviews (account_id) where resolved_at is null;

-- Same visibility as the account's movements; written by the worker, resolved through RPCs.
alter table bank_sync_reviews enable row level security;
revoke all on bank_sync_reviews from anon, authenticated;
grant select on bank_sync_reviews to authenticated;
create policy bank_sync_reviews_select on bank_sync_reviews for select using (account_id in (select visible_account_ids()));
