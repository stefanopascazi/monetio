-- Bank sync (#38): resolving the "Da rivedere" queue. Anyone who sees the account can decide:
--   added   -> the bank movement becomes a new booked movement;
--   matched -> it is the candidate movement: the candidate takes the bank's amount, date and reference
--              (the other side of a transfer follows the amount);
--   ignored -> nothing is written, the reference stays known so the sync does not ask again.
create function resolve_bank_review(p_review uuid, p_action text) returns void
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
    update transactions set amount_cents = r.amount_cents, booked_on = r.booked_on, bank_ref = r.bank_ref, updated_at = now()
    where id = r.candidate_transaction_id and account_id = r.account_id and bank_ref is null
    returning transfer_group_id into v_group;
    if not found then raise exception 'candidate not available' using errcode = 'P0002'; end if;
    if v_group is not null then
      update transactions set amount_cents = -r.amount_cents, updated_at = now()
      where transfer_group_id = v_group and id <> r.candidate_transaction_id and parent_transaction_id is null;
    end if;
  end if;

  update bank_sync_reviews set resolved_at = now(), resolution = p_action where id = r.id;
end $$;
revoke execute on function resolve_bank_review from public, anon;
grant execute on function resolve_bank_review to authenticated;
