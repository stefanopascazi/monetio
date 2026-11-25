-- VPS monitoring (#104, block 1): machine metrics sampled by the worker every minute, hourly rollups and the
-- console read model. Minute samples are kept 7 days, hourly rollups 35 days (the console shows up to 30).
-- Service-only tables: RLS on, no policies, no grants; the console reads through admin_vps().

create table vps_metrics (
  sampled_at timestamptz primary key,
  -- CPU busy share since the previous sample; null on the first sample after a worker start.
  cpu_pct real check (cpu_pct between 0 and 100),
  load1 real not null check (load1 >= 0),
  load5 real not null check (load5 >= 0),
  load15 real not null check (load15 >= 0),
  mem_total_bytes bigint not null check (mem_total_bytes >= 0),
  -- MemTotal - MemAvailable: what the kernel cannot hand out without swapping.
  mem_used_bytes bigint not null check (mem_used_bytes >= 0),
  swap_total_bytes bigint not null check (swap_total_bytes >= 0),
  swap_used_bytes bigint not null check (swap_used_bytes >= 0),
  disk_total_bytes bigint not null check (disk_total_bytes >= 0),
  disk_used_bytes bigint not null check (disk_used_bytes >= 0),
  -- Bytes since the previous sample on every interface but loopback; null after a restart or counter reset.
  net_rx_bytes bigint check (net_rx_bytes >= 0),
  net_tx_bytes bigint check (net_tx_bytes >= 0),
  uptime_s bigint not null check (uptime_s >= 0),
  worker_rss_bytes bigint not null check (worker_rss_bytes >= 0),
  worker_started_at timestamptz not null
);
alter table vps_metrics enable row level security;
revoke all on vps_metrics from anon, authenticated;

create table vps_metrics_hourly (
  hour timestamptz primary key,
  samples integer not null check (samples > 0),
  cpu_avg real,
  cpu_max real,
  load1_avg real not null,
  mem_total_bytes bigint not null,
  mem_used_avg bigint not null,
  mem_used_max bigint not null,
  swap_total_bytes bigint not null,
  swap_used_max bigint not null,
  disk_total_bytes bigint not null,
  disk_used_max bigint not null,
  net_rx_bytes bigint not null,
  net_tx_bytes bigint not null,
  worker_rss_max bigint not null
);
alter table vps_metrics_hourly enable row level security;
revoke all on vps_metrics_hourly from anon, authenticated;

-- Minute samples grouped by hour, from `p_from` on. Shared by the rollup and by admin_vps() for hours not rolled yet.
create function vps_hourly_from(p_from timestamptz)
returns setof vps_metrics_hourly
language sql stable security definer set search_path = public as $$
  select date_trunc('hour', sampled_at), count(*)::int,
         avg(cpu_pct)::real, max(cpu_pct), avg(load1)::real,
         max(mem_total_bytes), round(avg(mem_used_bytes))::bigint, max(mem_used_bytes),
         max(swap_total_bytes), max(swap_used_bytes),
         max(disk_total_bytes), max(disk_used_bytes),
         coalesce(sum(net_rx_bytes), 0)::bigint, coalesce(sum(net_tx_bytes), 0)::bigint,
         max(worker_rss_bytes)
  from vps_metrics
  where sampled_at >= p_from
  group by 1;
$$;
revoke execute on function vps_hourly_from from public, anon, authenticated;

-- Hourly job of the worker: rolls up completed hours (the latest rolled one again, it is idempotent) and
-- applies the retention. Returns what it did.
create function rollup_vps_metrics() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_from timestamptz := coalesce((select max(hour) from vps_metrics_hourly), '-infinity');
  v_hours integer;
  v_samples integer;
  v_old_hours integer;
begin
  insert into vps_metrics_hourly
  select * from vps_hourly_from(v_from) h where h.hour < date_trunc('hour', now())
  on conflict (hour) do update set
    samples = excluded.samples, cpu_avg = excluded.cpu_avg, cpu_max = excluded.cpu_max, load1_avg = excluded.load1_avg,
    mem_total_bytes = excluded.mem_total_bytes, mem_used_avg = excluded.mem_used_avg, mem_used_max = excluded.mem_used_max,
    swap_total_bytes = excluded.swap_total_bytes, swap_used_max = excluded.swap_used_max,
    disk_total_bytes = excluded.disk_total_bytes, disk_used_max = excluded.disk_used_max,
    net_rx_bytes = excluded.net_rx_bytes, net_tx_bytes = excluded.net_tx_bytes, worker_rss_max = excluded.worker_rss_max;
  get diagnostics v_hours = row_count;
  delete from vps_metrics where sampled_at < now() - interval '7 days';
  get diagnostics v_samples = row_count;
  delete from vps_metrics_hourly where hour < now() - interval '35 days';
  get diagnostics v_old_hours = row_count;
  return jsonb_build_object('hours', v_hours, 'purged_samples', v_samples, 'purged_hours', v_old_hours);
end $$;
revoke execute on function rollup_vps_metrics from public, anon, authenticated;

-- Console: latest sample plus one series for the range. 24h = 5-minute buckets of the minute samples;
-- 7d = hourly; 30d = 4-hour buckets. Hours not rolled up yet are computed on the fly.
create function admin_vps(p_range text default '24h') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_bucket interval;
  v_series jsonb;
begin
  if not is_sysadmin() then raise exception 'not a sysadmin' using errcode = '42501'; end if;
  v_bucket := case p_range when '24h' then interval '5 minutes' when '7d' then interval '1 hour' when '30d' then interval '4 hours' end;
  if v_bucket is null then raise exception 'unknown range %', p_range using errcode = '22023'; end if;

  if p_range = '24h' then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.t), '[]'::jsonb) into v_series from (
      select date_bin(v_bucket, sampled_at, timestamptz '2000-01-01') as t,
             avg(cpu_pct)::real as cpu_avg, max(cpu_pct) as cpu_max, avg(load1)::real as load1,
             max(mem_total_bytes) as mem_total, round(avg(mem_used_bytes))::bigint as mem_used,
             max(swap_total_bytes) as swap_total, max(swap_used_bytes) as swap_used,
             max(disk_total_bytes) as disk_total, max(disk_used_bytes) as disk_used,
             coalesce(sum(net_rx_bytes), 0)::bigint as net_rx, coalesce(sum(net_tx_bytes), 0)::bigint as net_tx,
             max(worker_rss_bytes) as worker_rss
      from vps_metrics where sampled_at >= now() - interval '24 hours'
      group by 1) b;
  else
    select coalesce(jsonb_agg(to_jsonb(b) order by b.t), '[]'::jsonb) into v_series from (
      select date_bin(v_bucket, h.hour, timestamptz '2000-01-01') as t,
             (sum(h.cpu_avg * h.samples) / nullif(sum(h.samples) filter (where h.cpu_avg is not null), 0))::real as cpu_avg,
             max(h.cpu_max) as cpu_max, (sum(h.load1_avg * h.samples) / sum(h.samples))::real as load1,
             max(h.mem_total_bytes) as mem_total, round(sum(h.mem_used_avg * h.samples)::numeric / sum(h.samples))::bigint as mem_used,
             max(h.swap_total_bytes) as swap_total, max(h.swap_used_max) as swap_used,
             max(h.disk_total_bytes) as disk_total, max(h.disk_used_max) as disk_used,
             sum(h.net_rx_bytes)::bigint as net_rx, sum(h.net_tx_bytes)::bigint as net_tx,
             max(h.worker_rss_max) as worker_rss
      from (
        select * from vps_metrics_hourly
        union all
        select * from vps_hourly_from(coalesce((select max(hour) + interval '1 hour' from vps_metrics_hourly), '-infinity'))
      ) h
      where h.hour >= now() - case p_range when '7d' then interval '7 days' else interval '30 days' end
      group by 1) b;
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'range', p_range,
    'bucket_seconds', extract(epoch from v_bucket)::int,
    -- No sample for this long = heartbeat missing (the console flags it; block 2 turns it into an anomaly).
    'stale_after_seconds', 300,
    'current', (select to_jsonb(m) from vps_metrics m order by sampled_at desc limit 1),
    'series', v_series);
end $$;
revoke execute on function admin_vps from public, anon;
grant execute on function admin_vps to authenticated;
