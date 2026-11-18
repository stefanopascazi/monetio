-- Bank sync (#38), family phase: each person registers their own Enable Banking application
-- (free restricted mode covers only accounts linked by the application's owner) and stores here
-- its id and private key. The key is sealed by the app (AES-256-GCM, master key only in the
-- environment) before it reaches the database; it is never stored in clear.
create table bank_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'enable_banking' check (provider = 'enable_banking'),
  environment text not null check (environment in ('sandbox', 'production')),
  app_id text not null check (app_id ~ '^[A-Za-z0-9-]{8,64}$'),
  app_name text check (length(app_name) <= 120),
  -- "v1.<iv>.<tag>.<ciphertext>", sealed with the owner's user id as context.
  private_key_sealed text not null check (private_key_sealed ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Service-only table: RLS on with no policies keeps it out of the public REST API. Writes and
-- reads of the sealed key go through vetted server code with the service role.
alter table bank_credentials enable row level security;
revoke all on bank_credentials from anon, authenticated;

-- The caller's application, without the key: what the settings page shows.
create function my_bank_credentials()
returns table (environment text, app_id text, app_name text, verified_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select environment, app_id, app_name, verified_at, updated_at from bank_credentials where user_id = auth.uid()
$$;
revoke execute on function my_bank_credentials from public, anon;
grant execute on function my_bank_credentials to authenticated;

-- Lets a person remove their own application at any time.
create function delete_my_bank_credentials() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from bank_credentials where user_id = auth.uid();
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function delete_my_bank_credentials from public, anon;
grant execute on function delete_my_bank_credentials to authenticated;
