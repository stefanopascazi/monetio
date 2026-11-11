-- One row per statement import, so the "Storico import" page can list and undo whole imports.
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  file_name text not null,
  -- Bank preset that recognised the file; null for a manual mapping.
  bank text,
  row_count integer not null default 0,
  total_cents bigint not null default 0,
  first_date date,
  last_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index on import_batches (household_id, created_at desc);

alter table transactions add column import_batch_id uuid references import_batches(id) on delete set null;
create index on transactions (import_batch_id) where import_batch_id is not null;

-- Same visibility as the account's movements: private accounts stay private.
alter table import_batches enable row level security;
create policy import_batches_select on import_batches for select using (account_id in (select visible_account_ids()));
create policy import_batches_insert on import_batches for insert
  with check (is_household_member(household_id) and can_see_account(account_id));
create policy import_batches_update on import_batches for update using (account_id in (select visible_account_ids()))
  with check (is_household_member(household_id) and can_see_account(account_id));
revoke all on import_batches from anon;
grant select, insert, update on import_batches to authenticated;

-- Deletes the movements of an import and marks it undone, atomically. Runs as the caller (RLS applies).
-- Imported rows linked as giroconti to a movement that existed before keep that movement: it is first
-- turned back into a plain income/expense, otherwise the transfer mirror trigger would delete it too.
create or replace function undo_import(p_batch uuid) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  n integer;
begin
  if not exists (select 1 from import_batches where id = p_batch and undone_at is null) then
    raise exception 'import not found';
  end if;
  update transactions o set
      kind = case when o.amount_cents > 0 then 'income'::transaction_kind else 'expense'::transaction_kind end,
      counterpart_account_id = null,
      transfer_group_id = null
    from transactions i
    where i.import_batch_id = p_batch and i.transfer_group_id is not null
      and o.transfer_group_id = i.transfer_group_id and o.id <> i.id
      and o.import_batch_id is distinct from p_batch and o.parent_transaction_id is null;
  delete from transactions where import_batch_id = p_batch;
  get diagnostics n = row_count;
  update import_batches set undone_at = now() where id = p_batch;
  return n;
end $$;
revoke execute on function undo_import from public, anon;
grant execute on function undo_import to authenticated;
