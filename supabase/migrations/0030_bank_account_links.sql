-- Bank sync (#38): the owner of a consent chooses which MonetIO account each bank account feeds.
-- A MonetIO account is fed by at most one bank account, so the sync never writes it twice.
create unique index bank_accounts_one_per_account on bank_accounts (account_id) where account_id is not null;

-- Links (or unlinks, with null) a bank account of the caller to an account of the consent's
-- household that the caller can see: shared, or private and their own. Not archived.
create function link_bank_account(p_bank_account uuid, p_account uuid) returns void
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

  update bank_accounts set account_id = p_account where id = p_bank_account;
end $$;
revoke execute on function link_bank_account from public, anon;
grant execute on function link_bank_account to authenticated;
