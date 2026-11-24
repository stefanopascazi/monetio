-- Bank link state of a household's accounts (#103), for the projection reliability: a bank-synced
-- account needs no history import or manual update. Consents are private to their owner, so members
-- read only these flags, never names, errors or identifiers of someone else's consent.
-- One bank account per MonetIO account (bank_accounts_one_per_account), so one row per account.
create function bank_link_states(p_household uuid)
returns table (account_id uuid, consent_active boolean, last_synced_at timestamptz, failing boolean)
language sql stable security definer set search_path = public as $$
  select ba.account_id,
         c.status = 'active' and c.valid_until > now(),
         ba.last_synced_at,
         ba.last_error is not null
  from bank_accounts ba
  join bank_connections c on c.id = ba.connection_id
  join accounts a on a.id = ba.account_id and a.household_id = c.household_id
  where c.household_id = p_household
    and ba.sync_confirmed_at is not null and a.archived_at is null
    and is_household_member(p_household)
$$;
revoke execute on function bank_link_states from public, anon;
grant execute on function bank_link_states to authenticated;
