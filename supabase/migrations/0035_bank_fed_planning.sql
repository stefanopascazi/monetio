-- Bank-fed accounts (#93): the bank writes what happened, MonetIO only what it expects.
-- Rule movements on these accounts stay planned until a bank movement confirms them, and one bank
-- movement may confirm several of them at once (a cumulative transfer paying many rules).

-- Bank reference of a movement confirmed together with others by one bank movement.
-- `bank_ref` stays unique per account, so rows reconciled as a batch keep the reference here.
alter table transactions add column bank_batch_ref text check (length(bank_batch_ref) <= 120);
create index on transactions (account_id, bank_batch_ref) where bank_batch_ref is not null;

-- Accounts of a household fed by a bank: linked, consent active, first sync confirmed.
-- Members see their household's; the service role (no auth.uid()) sees any.
create function bank_fed_account_ids(p_household uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select ba.account_id
  from bank_accounts ba
  join bank_connections c on c.id = ba.connection_id
  join accounts a on a.id = ba.account_id and a.household_id = c.household_id
  where c.household_id = p_household
    and c.status = 'active' and c.valid_until > now()
    and ba.sync_confirmed_at is not null and a.archived_at is null
    and (auth.uid() is null or is_household_member(p_household))
$$;
revoke execute on function bank_fed_account_ids from public, anon;
grant execute on function bank_fed_account_ids to authenticated, service_role;

-- Confirms recorded movements of an account with one bank movement. A single row takes the
-- reference in `bank_ref`, several share it in `bank_batch_ref`. Planned rows become booked on the
-- bank date and their fee rows follow. All or nothing: returns 0 when any row is not available.
create function reconcile_bank_rows(p_account uuid, p_ids uuid[], p_ref text, p_booked_on date) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_single boolean := cardinality(p_ids) = 1;
begin
  if coalesce(cardinality(p_ids), 0) = 0 then return 0; end if;
  if (select count(*) from transactions
      where id = any(p_ids) and account_id = p_account and bank_ref is null and bank_batch_ref is null) <> cardinality(p_ids) then
    return 0;
  end if;

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
-- Called by the RPCs below and by the worker (database owner) only.
revoke execute on function reconcile_bank_rows from public, anon, authenticated;

-- Same as 0033, with reconcile items carrying `transaction_ids` (one or more rows).
create or replace function confirm_bank_sync(p_bank_account uuid, p_from date, p_balance_cents bigint, p_balance_on date, p_decisions jsonb)
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
    elsif d->>'type' = 'reconcile' and jsonb_typeof(d->'transaction_ids') = 'array' then
      perform reconcile_bank_rows(v_account, array(select jsonb_array_elements_text(d->'transaction_ids'))::uuid[],
                                  d->>'ref', (d->>'booked_on')::date);
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

-- Same as 0032; a matched candidate still planned becomes booked, its fee rows follow.
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
    insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, bank_ref, created_by)
    values (r.household_id, r.account_id, case when r.amount_cents >= 0 then 'income' else 'expense' end::transaction_kind,
            'booked', 'bank', r.amount_cents, r.booked_on, r.description, r.bank_ref, auth.uid())
    on conflict (account_id, bank_ref) where bank_ref is not null do nothing;
  elsif p_action = 'matched' then
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
