-- VPS alerts (#104, block 2): configurable thresholds, alerts opened and resolved by the worker's vps-alerts job,
-- one-off events (silence, unexpected worker restart, reboot) and the console read/write model.
-- A VPS that is down cannot report itself: the real-time alert stays on Healthchecks.io, the console flags the
-- missing heartbeat at read time and the worker records the silence once it is back.

-- Release of the worker that took the sample: a restart with the same release is unexpected, a new one is a deploy.
alter table vps_metrics add column worker_release text check (length(worker_release) <= 80);

-- One row. Percent thresholds open an alert above the value; it resolves a few points below (hysteresis in the worker).
create table vps_alert_settings (
  id boolean primary key default true check (id),
  cpu_pct real not null default 90 check (cpu_pct between 10 and 100),
  cpu_minutes integer not null default 15 check (cpu_minutes between 5 and 120),
  ram_pct real not null default 90 check (ram_pct between 10 and 100),
  ram_minutes integer not null default 10 check (ram_minutes between 5 and 120),
  swap_pct real not null default 50 check (swap_pct between 10 and 100),
  disk_pct real not null default 85 check (disk_pct between 10 and 100),
  -- Traffic of the last 15 minutes above this multiple of the 7-day average, and above the floor.
  traffic_factor real not null default 5 check (traffic_factor between 1.5 and 100),
  traffic_floor_mb integer not null default 50 check (traffic_floor_mb between 1 and 100000),
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into vps_alert_settings default values;
alter table vps_alert_settings enable row level security;
revoke all on vps_alert_settings from anon, authenticated;

-- Threshold alerts stay open until resolved (one open per kind); events are stored already resolved.
create table vps_alerts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('cpu_high', 'ram_high', 'swap_high', 'disk_high', 'traffic_spike', 'silence', 'worker_restart', 'reboot')),
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 2048)
);
create unique index vps_alerts_one_open on vps_alerts (kind) where resolved_at is null;
create index on vps_alerts (opened_at desc);
alter table vps_alerts enable row level security;
revoke all on vps_alerts from anon, authenticated;

-- Last sample the job has looked at, so events are raised once.
create table vps_alert_state (
  id boolean primary key default true check (id),
  evaluated_until timestamptz
);
insert into vps_alert_state default values;
alter table vps_alert_state enable row level security;
revoke all on vps_alert_state from anon, authenticated;

-- Console: thresholds, open alerts, alerts and events of the last 7 days, heartbeat inputs.
create function admin_vps_alerts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'generated_at', now(),
    'last_sample_at', (select max(sampled_at) from vps_metrics),
    'stale_after_seconds', 300,
    'settings', (select to_jsonb(s) - 'id' - 'updated_by' from vps_alert_settings s),
    'open', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'opened_at', a.opened_at, 'last_seen_at', a.last_seen_at, 'details', a.details)
                       order by a.opened_at)
      from vps_alerts a where a.resolved_at is null), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'opened_at', a.opened_at, 'resolved_at', a.resolved_at, 'details', a.details)
                       order by a.opened_at desc)
      from (select * from vps_alerts where resolved_at is not null and opened_at > now() - interval '7 days'
            order by opened_at desc limit 50) a), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke execute on function admin_vps_alerts from public, anon;
grant execute on function admin_vps_alerts to authenticated;

-- Console: updates the thresholds given in p (others unchanged); the table checks validate the values. Audit-logged.
create function admin_set_vps_alert_settings(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  if exists (select 1 from jsonb_object_keys(p) k
             where k not in ('cpu_pct', 'cpu_minutes', 'ram_pct', 'ram_minutes', 'swap_pct', 'disk_pct', 'traffic_factor', 'traffic_floor_mb', 'push_enabled')) then
    raise exception 'unknown setting' using errcode = '22023';
  end if;
  update vps_alert_settings set
    cpu_pct = coalesce((p->>'cpu_pct')::real, cpu_pct),
    cpu_minutes = coalesce((p->>'cpu_minutes')::integer, cpu_minutes),
    ram_pct = coalesce((p->>'ram_pct')::real, ram_pct),
    ram_minutes = coalesce((p->>'ram_minutes')::integer, ram_minutes),
    swap_pct = coalesce((p->>'swap_pct')::real, swap_pct),
    disk_pct = coalesce((p->>'disk_pct')::real, disk_pct),
    traffic_factor = coalesce((p->>'traffic_factor')::real, traffic_factor),
    traffic_floor_mb = coalesce((p->>'traffic_floor_mb')::integer, traffic_floor_mb),
    push_enabled = coalesce((p->>'push_enabled')::boolean, push_enabled),
    updated_at = now(), updated_by = auth.uid();
  perform admin_log('vps.settings', null, p);
end $$;
revoke execute on function admin_set_vps_alert_settings from public, anon;
grant execute on function admin_set_vps_alert_settings to authenticated;
