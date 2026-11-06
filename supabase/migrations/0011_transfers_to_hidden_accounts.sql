-- Transfers can target household accounts the caller cannot see (e.g. a partner's private
-- account). The insert policy already allows the mirror row; these changes keep both sides
-- in sync and let forms list only accounts still in use.

-- Hidden accounts also report whether they are archived, so forms can skip them.
drop function if exists hidden_account_owners(uuid);
create function hidden_account_owners(p_household uuid) returns table (id uuid, owner_name text, archived boolean)
language sql stable security definer set search_path = public as $$
  select a.id, coalesce(o.display_name, ''), a.archived_at is not null from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  left join household_members o on o.id = a.owner_member_id
  where a.household_id = p_household and a.visibility = 'private' and a.owner_member_id is distinct from me.id
  order by a.created_at
$$;
revoke execute on function hidden_account_owners from anon;

-- Edits and deletes of one transfer side follow on the other side, even when the caller
-- cannot see it (RLS would silently skip it). Fee rows are never touched here.
create or replace function sync_transfer_mirror() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 or old.transfer_group_id is null or old.parent_transaction_id is not null then
    return null;
  end if;
  if tg_op = 'DELETE' then
    delete from transactions
      where transfer_group_id = old.transfer_group_id and id <> old.id and parent_transaction_id is null;
  else
    update transactions set
        amount_cents = -new.amount_cents,
        booked_on = new.booked_on,
        description = new.description,
        notes = new.notes,
        status = new.status,
        category_id = new.category_id
      where transfer_group_id = new.transfer_group_id and id <> new.id and parent_transaction_id is null
        and (amount_cents, booked_on, description, notes, status, category_id)
          is distinct from (-new.amount_cents, new.booked_on, new.description, new.notes, new.status, new.category_id);
  end if;
  return null;
end $$;
revoke execute on function sync_transfer_mirror from anon;

create trigger transactions_transfer_mirror
  after update of amount_cents, booked_on, description, notes, status, category_id or delete on transactions
  for each row execute function sync_transfer_mirror();
