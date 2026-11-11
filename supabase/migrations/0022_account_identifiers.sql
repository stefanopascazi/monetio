-- Bank identifiers of an account, used by statement imports to recognise giroconti between
-- household accounts (an IBAN or a card's last digits in a movement description).
alter table accounts
  add column iban text,
  add column bic text,
  add column card_last4 text[] not null default '{}';

-- Stored normalised (uppercase, no spaces); the app also checks the mod 97 digits.
alter table accounts add constraint accounts_iban_format check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$');
alter table accounts add constraint accounts_bic_format check (bic is null or bic ~ '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$');
alter table accounts add constraint accounts_card_last4_format check (array_to_string(card_last4, ',') ~ '^([0-9]{4}(,[0-9]{4})*)?$');
create unique index accounts_household_iban on accounts (household_id, iban) where iban is not null;

-- Household accounts (private ones of other members included) owning the given IBANs or card
-- digits. Returns only the account id next to the identifier the caller already holds, so it
-- never reveals another member's account details.
create function match_household_accounts(p_household uuid, p_ibans text[], p_cards text[])
returns table (account_id uuid, iban text, card text)
language sql stable security definer set search_path = public as $$
  select a.id, a.iban, null::text from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  where a.household_id = p_household and a.archived_at is null and a.iban = any(p_ibans)
  union all
  select a.id, null::text, c.card from accounts a
  join household_members me on me.household_id = a.household_id and me.user_id = auth.uid()
  cross join lateral unnest(a.card_last4) as c(card)
  where a.household_id = p_household and a.archived_at is null and c.card = any(p_cards)
$$;
revoke execute on function match_household_accounts from public, anon;
grant execute on function match_household_accounts to authenticated;
