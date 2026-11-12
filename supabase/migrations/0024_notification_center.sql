-- Notification center (#28): the push outbox doubles as the in-app inbox (bell), plus
-- per-user notification preferences. Rows are still purged by the worker after 30 days.

alter table push_outbox
  -- Event type: due_soon, overdue, low_balance, stale_account, budget_exceeded, test.
  add column kind text not null default 'test',
  add column household_id uuid references households(id) on delete cascade,
  add column read_at timestamptz,
  -- Push is held until then (quiet hours); the bell shows the row at once.
  add column push_after timestamptz not null default now();

create index on push_outbox (user_id, created_at desc);
drop index if exists push_outbox_created_at_idx;
create index on push_outbox (push_after) where sent_at is null;

-- Users read their own notifications (test ones excluded) and mark them read; nothing else.
create policy push_outbox_select on push_outbox for select using (user_id = auth.uid() and kind <> 'test');
create policy push_outbox_update on push_outbox for update using (user_id = auth.uid() and kind <> 'test') with check (user_id = auth.uid());
revoke all on push_outbox from anon, authenticated;
grant select on push_outbox to authenticated;
grant update (read_at) on push_outbox to authenticated;

create or replace function queue_test_notification() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from push_subscriptions where user_id = auth.uid()) then return false; end if;
  insert into push_outbox (user_id, kind, title, body, url, tag, dedup_key)
  values (auth.uid(), 'test', 'MonetIO', 'Le notifiche funzionano su questo dispositivo.', '/impostazioni', 'test',
          'test:' || auth.uid() || ':' || to_char(now() at time zone 'UTC', 'YYYYMMDDHH24MI'))
  on conflict (dedup_key) do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- One row per user; a missing row means defaults (see lib/notifications/prefs.ts).
create table notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Event types whose push is off (they still reach the bell).
  push_muted_kinds text[] not null default '{}',
  -- Quiet hours in Europe/Rome, whole hours; both null = off. Start > end wraps midnight.
  quiet_start smallint check (quiet_start between 0 and 23),
  quiet_end smallint check (quiet_end between 0 and 23),
  due_days smallint not null default 3 check (due_days between 0 and 14),
  stale_days smallint not null default 14 check (stale_days between 3 and 90),
  -- Account id -> month-end threshold in cents; accounts without an entry use 0.
  low_balance_cents jsonb not null default '{}' check (jsonb_typeof(low_balance_cents) = 'object'),
  updated_at timestamptz not null default now(),
  constraint quiet_hours_pair check ((quiet_start is null) = (quiet_end is null))
);

alter table notification_prefs enable row level security;
create policy notification_prefs_select on notification_prefs for select using (user_id = auth.uid());
create policy notification_prefs_insert on notification_prefs for insert with check (user_id = auth.uid());
create policy notification_prefs_update on notification_prefs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on notification_prefs from anon;
grant select, insert, update on notification_prefs to authenticated;
