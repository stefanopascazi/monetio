-- Bank sync (#38): consents given by a person at a bank (one session each) and the accounts it
-- covers. Rows are written only by server code (service role) after the consent flow; the owner
-- reads them without the sealed session id.
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  aspsp_name text not null check (length(aspsp_name) between 1 and 120),
  aspsp_country text not null check (aspsp_country ~ '^[A-Z]{2}$'),
  -- Enable Banking session id, sealed like the private key (user id as context).
  session_id_sealed text not null check (session_id_sealed ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  valid_until timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text check (length(last_error) <= 300)
);
create index on bank_connections (user_id);

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references bank_connections(id) on delete cascade,
  -- Enable Banking account uid: usable only with the owner's application key.
  uid text not null check (length(uid) between 1 and 200),
  name text check (length(name) <= 120),
  iban_masked text check (length(iban_masked) <= 40),
  currency text check (currency ~ '^[A-Z]{3}$'),
  -- MonetIO account fed by this bank account (chosen by the owner); null until linked.
  account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (connection_id, uid)
);
create index on bank_accounts (account_id) where account_id is not null;

alter table bank_connections enable row level security;
alter table bank_accounts enable row level security;
revoke all on bank_connections, bank_accounts from anon, authenticated;

create policy bank_connections_select on bank_connections for select using (user_id = auth.uid());
create policy bank_accounts_select on bank_accounts for select
  using (exists (select 1 from bank_connections c where c.id = connection_id and c.user_id = auth.uid()));

-- Column grants keep the sealed session id out of reach even for the owner.
grant select (id, user_id, household_id, aspsp_name, aspsp_country, valid_until, status, created_at, last_synced_at, last_error)
  on bank_connections to authenticated;
grant select (id, connection_id, name, iban_masked, currency, account_id, created_at) on bank_accounts to authenticated;
