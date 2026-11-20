-- Undoable bank syncs (#88): every sync (worker run or confirmed preview) records a batch with what
-- it wrote, so the owner can roll the account back from the "Banche" page.

create table bank_sync_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  kind text not null check (kind in ('worker', 'preview')),
  inserted integer not null default 0,
  reconciled integer not null default 0,
  review integer not null default 0,
  -- Last sync of the bank account before this one: restored on undo so the next sync re-reads.
  previous_synced_at timestamptz,
  -- Wall clock, not transaction start: batches must order even within one transaction.
  created_at timestamptz not null default clock_timestamp(),
  undone_at timestamptz,
  undone_by uuid references auth.users(id) on delete set null
);
create index on bank_sync_batches (account_id, created_at desc);

alter table bank_sync_batches enable row level security;
revoke all on bank_sync_batches from anon, authenticated;
grant select on bank_sync_batches to authenticated;
create policy bank_sync_batches_select on bank_sync_batches for select using (account_id in (select visible_account_ids()));

-- Rows written by a batch: bank movements it inserted (or a "Da rivedere" item added later).
alter table transactions add column bank_sync_batch_id uuid references bank_sync_batches(id) on delete set null;
create index on transactions (bank_sync_batch_id) where bank_sync_batch_id is not null;

-- "Da rivedere" items queued (or excluded) by a batch.
alter table bank_sync_reviews add column batch_id uuid references bank_sync_batches(id) on delete set null;
create index on bank_sync_reviews (batch_id) where batch_id is not null;

-- Recorded movements a batch changed (reconciled, or merged by "È lo stesso"), with the values
-- they had before. The first change wins: it holds the state to go back to.
create table bank_sync_batch_changes (
  batch_id uuid not null references bank_sync_batches(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  prev_amount_cents bigint not null,
  prev_booked_on date not null,
  prev_status transaction_status not null,
  primary key (batch_id, transaction_id)
);
alter table bank_sync_batch_changes enable row level security;
revoke all on bank_sync_batch_changes from anon, authenticated;

-- Opens a batch for a bank account; called by confirm_bank_sync and by the worker (database owner).
create function open_bank_sync_batch(p_bank_account uuid, p_kind text) returns uuid
language sql security definer set search_path = public as $$
  insert into bank_sync_batches (household_id, account_id, bank_account_id, kind, previous_synced_at)
  select c.household_id, ba.account_id, ba.id, p_kind, ba.last_synced_at
  from bank_accounts ba join bank_connections c on c.id = ba.connection_id
  where ba.id = p_bank_account and ba.account_id is not null
  returning id
$$;
revoke execute on function open_bank_sync_batch from public, anon, authenticated;

-- Stores counts, or drops the batch when it wrote nothing.
create function close_bank_sync_batch(p_batch uuid, p_inserted integer, p_reconciled integer, p_review integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_inserted + p_reconciled + p_review = 0 then
    delete from bank_sync_batches where id = p_batch;
  else
    update bank_sync_batches set inserted = p_inserted, reconciled = p_reconciled, review = p_review where id = p_batch;
  end if;
end $$;
revoke execute on function close_bank_sync_batch from public, anon, authenticated;

-- Remembers the current values of movements (and their planned fee rows) before a batch changes them.
create function snapshot_bank_rows(p_batch uuid, p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  insert into bank_sync_batch_changes (batch_id, transaction_id, prev_amount_cents, prev_booked_on, prev_status)
  select p_batch, t.id, t.amount_cents, t.booked_on, t.status
  from transactions t
  where p_batch is not null and (t.id = any(p_ids) or t.parent_transaction_id = any(p_ids))
  on conflict do nothing
$$;
revoke execute on function snapshot_bank_rows from public, anon, authenticated;

-- Same as 0035, recording the rows it changes in p_batch (when given).
drop function reconcile_bank_rows(uuid, uuid[], text, date);
create function reconcile_bank_rows(p_account uuid, p_ids uuid[], p_ref text, p_booked_on date, p_batch uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_single boolean := cardinality(p_ids) = 1;
begin
  if coalesce(cardinality(p_ids), 0) = 0 then return 0; end if;
  if (select count(*) from transactions
      where id = any(p_ids) and account_id = p_account and bank_ref is null and bank_batch_ref is null) <> cardinality(p_ids) then
    return 0;
  end if;

  perform snapshot_bank_rows(p_batch, p_ids);

  update transactions
  set bank_ref = case when v_single then p_ref end,
      bank_batch_ref = case when v_single then null else p_ref end,
      booked_on = case when status = 'planned' then p_booked_on else booked_on end,
      status = 'booked',
      updated_at = now()
  where id = any(p_ids);

  update transactions f
  set status = 'booked', booked_on = p.booked_on, updated_at = now()
  from transactions p
  where f.parent_transaction_id = p.id and p.id = any(p_ids) and f.status = 'planned';

  return cardinality(p_ids);
end $$;
revoke execute on function reconcile_bank_rows(uuid, uuid[], text, date, uuid) from public, anon, authenticated;

-- Old signature kept for a worker still running the previous release (no batch recorded).
create function reconcile_bank_rows(p_account uuid, p_ids uuid[], p_ref text, p_booked_on date) returns integer
language sql security definer set search_path = public as $$
  select reconcile_bank_rows(p_account, p_ids, p_ref, p_booked_on, null::uuid)
$$;
revoke execute on function reconcile_bank_rows(uuid, uuid[], text, date) from public, anon, authenticated;

-- Same as 0035, writing the preview's decisions as a "preview" batch.
create or replace function confirm_bank_sync(p_bank_account uuid, p_from date, p_balance_cents bigint, p_balance_on date, p_decisions jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_household uuid;
  v_batch uuid;
  v_inserted integer := 0;
  v_reconciled integer := 0;
  v_review integer := 0;
  v_n integer;
  d jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_from is null or jsonb_typeof(p_decisions) <> 'array' then raise exception 'invalid input' using errcode = '22023'; end if;

  select ba.account_id, c.household_id into v_account, v_household
  from bank_accounts ba join bank_connections c on c.id = ba.connection_id
  where ba.id = p_bank_account and c.user_id = auth.uid() and c.status = 'active'
    and ba.account_id is not null and ba.sync_confirmed_at is null
  for update of ba;
  if v_account is null then raise exception 'bank account not available' using errcode = 'P0002'; end if;

  v_batch := open_bank_sync_batch(p_bank_account, 'preview');

  for d in select * from jsonb_array_elements(p_decisions) loop
    if d->>'type' = 'insert' then
      insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, bank_ref,
                                category_id, created_by, bank_sync_batch_id)
      values (v_household, v_account,
              case when (d->>'amount_cents')::bigint >= 0 then 'income' else 'expense' end::transaction_kind,
              'booked', 'bank', (d->>'amount_cents')::bigint, (d->>'booked_on')::date, d->>'description', d->>'ref',
              (select id from categories where id = (d->>'category_id')::uuid and household_id = v_household),
              auth.uid(), v_batch)
      on conflict (account_id, bank_ref) where bank_ref is not null do nothing;
      get diagnostics v_n = row_count;
      v_inserted := v_inserted + v_n;
    elsif d->>'type' = 'reconcile' and jsonb_typeof(d->'transaction_ids') = 'array' then
      v_n := reconcile_bank_rows(v_account, array(select jsonb_array_elements_text(d->'transaction_ids'))::uuid[],
                                 d->>'ref', (d->>'booked_on')::date, v_batch);
      if v_n > 0 then v_reconciled := v_reconciled + 1; end if;
    elsif d->>'type' in ('review', 'exclude') then
      insert into bank_sync_reviews (household_id, account_id, bank_ref, booked_on, amount_cents, description, reason,
                                     candidate_transaction_id, resolved_at, resolution, batch_id)
      values (v_household, v_account, d->>'ref', (d->>'booked_on')::date, (d->>'amount_cents')::bigint, d->>'description',
              case when d->>'type' = 'exclude' then 'excluded' else d->>'reason' end,
              (select id from transactions where id = (d->>'candidate_id')::uuid and account_id = v_account),
              case when d->>'type' = 'exclude' then now() end,
              case when d->>'type' = 'exclude' then 'ignored' end,
              v_batch)
      on conflict (account_id, bank_ref) do nothing;
      get diagnostics v_n = row_count;
      v_review := v_review + v_n;
    end if;
  end loop;

  -- A confirmed preview is always kept, even empty: undoing it brings the preview back.
  update bank_sync_batches set inserted = v_inserted, reconciled = v_reconciled, review = v_review where id = v_batch;

  update bank_accounts
  set sync_from = p_from, sync_confirmed_at = now(), last_synced_at = now(), last_error = null,
      bank_balance_cents = p_balance_cents, bank_balance_on = p_balance_on
  where id = p_bank_account;
end $$;

-- Same as 0035; an added movement joins the item's batch, a merged candidate keeps its previous values.
create or replace function resolve_bank_review(p_review uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r bank_sync_reviews%rowtype;
  v_group uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_action not in ('added', 'matched', 'ignored') then raise exception 'invalid action' using errcode = '22023'; end if;

  select * into r from bank_sync_reviews
  where id = p_review and resolved_at is null and account_id in (select visible_account_ids())
  for update;
  if r.id is null then raise exception 'review not found' using errcode = 'P0002'; end if;

  if p_action = 'added' then
    insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, bank_ref,
                              created_by, bank_sync_batch_id)
    values (r.household_id, r.account_id, case when r.amount_cents >= 0 then 'income' else 'expense' end::transaction_kind,
            'booked', 'bank', r.amount_cents, r.booked_on, r.description, r.bank_ref, auth.uid(), r.batch_id)
    on conflict (account_id, bank_ref) where bank_ref is not null do nothing;
  elsif p_action = 'matched' then
    if r.candidate_transaction_id is not null and exists (
      select 1 from transactions
      where id = r.candidate_transaction_id and account_id = r.account_id and bank_ref is null and bank_batch_ref is null
    ) then
      perform snapshot_bank_rows(r.batch_id, array[r.candidate_transaction_id]);
    end if;
    update transactions
    set amount_cents = r.amount_cents, booked_on = r.booked_on, bank_ref = r.bank_ref, status = 'booked', updated_at = now()
    where id = r.candidate_transaction_id and account_id = r.account_id and bank_ref is null and bank_batch_ref is null
    returning transfer_group_id into v_group;
    if not found then raise exception 'candidate not available' using errcode = 'P0002'; end if;
    update transactions set status = 'booked', booked_on = r.booked_on, updated_at = now()
    where parent_transaction_id = r.candidate_transaction_id and status = 'planned';
    if v_group is not null then
      update transactions set amount_cents = -r.amount_cents, updated_at = now()
      where transfer_group_id = v_group and id <> r.candidate_transaction_id and parent_transaction_id is null;
    end if;
  end if;

  update bank_sync_reviews set resolved_at = now(), resolution = p_action where id = r.id;
end $$;

-- Undoes the latest active batch of an account (newer ones first, so batches never overlap):
-- changed movements go back to their previous values, inserted ones are deleted, queued items removed.
-- Only the owner of the bank consent may do it. Returns the number of movements deleted.
create function undo_bank_sync(p_batch uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  b bank_sync_batches%rowtype;
  n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  select bsb.* into b from bank_sync_batches bsb
  join bank_accounts ba on ba.id = bsb.bank_account_id
  join bank_connections c on c.id = ba.connection_id
  where bsb.id = p_batch and bsb.undone_at is null and c.user_id = auth.uid()
  for update of bsb;
  if b.id is null then raise exception 'batch not found' using errcode = 'P0002'; end if;
  if exists (select 1 from bank_sync_batches where account_id = b.account_id and undone_at is null and created_at > b.created_at) then
    raise exception 'newer batch first' using errcode = '55000';
  end if;

  -- Merged or reconciled movements: previous values back, no bank reference (the mirror trigger
  -- carries amount, date and status to the other side of a transfer).
  update transactions t
  set amount_cents = ch.prev_amount_cents, booked_on = ch.prev_booked_on, status = ch.prev_status,
      bank_ref = null, bank_batch_ref = null, updated_at = now()
  from bank_sync_batch_changes ch
  where ch.batch_id = b.id and ch.transaction_id = t.id;

  -- Inserted movements later turned into transfers with an older movement keep that movement,
  -- turned back into a plain income/expense (as undo_import does).
  update transactions o set
      kind = case when o.amount_cents > 0 then 'income'::transaction_kind else 'expense'::transaction_kind end,
      counterpart_account_id = null,
      transfer_group_id = null
    from transactions i
    where i.bank_sync_batch_id = b.id and i.transfer_group_id is not null
      and o.transfer_group_id = i.transfer_group_id and o.id <> i.id
      and o.bank_sync_batch_id is distinct from b.id and o.parent_transaction_id is null;
  delete from transactions where bank_sync_batch_id = b.id;
  get diagnostics n = row_count;

  delete from bank_sync_reviews where batch_id = b.id;
  delete from bank_sync_batch_changes where batch_id = b.id;

  -- The bank account goes back to before the batch: a preview is asked again, a worker run re-reads.
  if b.kind = 'preview' then
    update bank_accounts
    set sync_from = null, sync_confirmed_at = null, last_synced_at = null, last_error = null,
        bank_balance_cents = null, bank_balance_on = null
    where id = b.bank_account_id and account_id = b.account_id;
  else
    update bank_accounts set last_synced_at = b.previous_synced_at
    where id = b.bank_account_id and account_id = b.account_id;
  end if;

  update bank_sync_batches set undone_at = now(), undone_by = auth.uid() where id = b.id;
  return n;
end $$;
revoke execute on function undo_bank_sync from public, anon;
grant execute on function undo_bank_sync to authenticated;
