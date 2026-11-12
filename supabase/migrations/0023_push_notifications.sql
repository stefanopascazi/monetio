-- Web push (#28): browser subscriptions per user and an outbox the VPS worker delivers from.

-- One row per browser/device that accepted notifications. The endpoint is globally unique:
-- the same browser re-subscribing under another user replaces the previous owner.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy push_subscriptions_select on push_subscriptions for select using (user_id = auth.uid());
create policy push_subscriptions_delete on push_subscriptions for delete using (user_id = auth.uid());
revoke all on push_subscriptions from anon;
grant select, delete on push_subscriptions to authenticated;

-- Notifications waiting for delivery. Producers (worker jobs, test button) insert; the worker
-- sends to every subscription of the user and stamps sent_at. dedup_key makes producers idempotent.
create table push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) <= 400),
  url text not null default '/' check (url ~ '^/([^/\\]|$)'),
  tag text,
  dedup_key text unique,
  created_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz
);
create index on push_outbox (created_at) where sent_at is null;

-- Service-only table: RLS on with no policies keeps it out of the public REST API.
alter table push_outbox enable row level security;

-- Stores the caller's subscription, taking the endpoint over from any previous owner.
create function register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'invalid endpoint' using errcode = '23514';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now(), last_success_at = null;
end $$;
revoke execute on function register_push_subscription from public, anon;
grant execute on function register_push_subscription to authenticated;

-- Queues a test notification for the caller. At most one per minute (dedup on the minute);
-- returns false when one was already queued in the same minute or no subscription exists.
create function queue_test_notification() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from push_subscriptions where user_id = auth.uid()) then return false; end if;
  insert into push_outbox (user_id, title, body, url, tag, dedup_key)
  values (auth.uid(), 'MonetIO', 'Le notifiche funzionano su questo dispositivo.', '/impostazioni', 'test',
          'test:' || auth.uid() || ':' || to_char(now() at time zone 'UTC', 'YYYYMMDDHH24MI'))
  on conflict (dedup_key) do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function queue_test_notification from public, anon;
grant execute on function queue_test_notification to authenticated;
