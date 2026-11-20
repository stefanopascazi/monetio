-- Bank sync preview (#87): a newly linked bank account is not synced by the worker until its owner
-- has seen a preview and confirmed it, choosing the first day to import.

alter table bank_accounts
  -- First day whose movements may be imported; older ones are left to the account's history.
  add column sync_from date,
  -- When the owner confirmed the first import; null = waiting for the preview, skipped by the worker.
  add column sync_confirmed_at timestamptz;
grant select (sync_from, sync_confirmed_at) on bank_accounts to authenticated;

-- Accounts already synced keep running as before.
update bank_accounts set sync_confirmed_at = last_synced_at where account_id is not null and last_synced_at is not null;

-- Movements left out in the preview: remembered (resolved as ignored) so later syncs never propose them.
alter table bank_sync_reviews drop constraint bank_sync_reviews_reason_check;
alter table bank_sync_reviews add constraint bank_sync_reviews_reason_check
  check (reason in ('amount_differs', 'possible_duplicate', 'ambiguous', 'excluded'));

-- Linking to another account starts over: a new preview is needed before any sync.
create or replace function link_bank_account(p_bank_account uuid, p_account uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_household uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select c.household_id into v_household
  from bank_accounts ba join bank_connections c on c.id = ba.connection_id
  where ba.id = p_bank_account and c.user_id = auth.uid();
  if v_household is null then raise exception 'bank account not found' using errcode = '42501'; end if;

  if p_account is not null and not exists (
    select 1 from accounts a
    join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
    where a.id = p_account and a.household_id = v_household and a.archived_at is null
      and (a.visibility = 'shared' or a.owner_member_id = me.id)
  ) then
    raise exception 'account not available' using errcode = '42501';
  end if;

  update bank_accounts
  set account_id = p_account,
      sync_from = null, sync_confirmed_at = null, last_synced_at = null, last_error = null,
      bank_balance_cents = null, bank_balance_on = null
  where id = p_bank_account and account_id is distinct from p_account;
end $$;

-- Confirms the preview: writes the chosen decisions (computed server-side from the bank's data)
-- and lets the worker take over from p_from. Each item of p_decisions:
--   {type: insert|reconcile|review|exclude, ref, booked_on, amount_cents, description,
--    category_id?, transaction_id? (reconcile), reason? + candidate_id? (review)}
create function confirm_bank_sync(p_bank_account uuid, p_from date, p_balance_cents bigint, p_balance_on date, p_decisions jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_household uuid;
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

  for d in select * from jsonb_array_elements(p_decisions) loop
    if d->>'type' = 'insert' then
      insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, bank_ref, category_id, created_by)
      values (v_household, v_account,
              case when (d->>'amount_cents')::bigint >= 0 then 'income' else 'expense' end::transaction_kind,
              'booked', 'bank', (d->>'amount_cents')::bigint, (d->>'booked_on')::date, d->>'description', d->>'ref',
              (select id from categories where id = (d->>'category_id')::uuid and household_id = v_household),
              auth.uid())
      on conflict (account_id, bank_ref) where bank_ref is not null do nothing;
    elsif d->>'type' = 'reconcile' then
      update transactions set bank_ref = d->>'ref', updated_at = now()
      where id = (d->>'transaction_id')::uuid and account_id = v_account and bank_ref is null;
    elsif d->>'type' in ('review', 'exclude') then
      insert into bank_sync_reviews (household_id, account_id, bank_ref, booked_on, amount_cents, description, reason,
                                     candidate_transaction_id, resolved_at, resolution)
      values (v_household, v_account, d->>'ref', (d->>'booked_on')::date, (d->>'amount_cents')::bigint, d->>'description',
              case when d->>'type' = 'exclude' then 'excluded' else d->>'reason' end,
              (select id from transactions where id = (d->>'candidate_id')::uuid and account_id = v_account),
              case when d->>'type' = 'exclude' then now() end,
              case when d->>'type' = 'exclude' then 'ignored' end)
      on conflict (account_id, bank_ref) do nothing;
    end if;
  end loop;

  update bank_accounts
  set sync_from = p_from, sync_confirmed_at = now(), last_synced_at = now(), last_error = null,
      bank_balance_cents = p_balance_cents, bank_balance_on = p_balance_on
  where id = p_bank_account;
end $$;
revoke execute on function confirm_bank_sync from public, anon;
grant execute on function confirm_bank_sync to authenticated;
