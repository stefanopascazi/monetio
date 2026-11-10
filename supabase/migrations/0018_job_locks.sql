-- Leases that keep background jobs from running twice at once (VPS worker vs Vercel cron fallback).
-- A lock is free when missing or when its lease has expired; holders release it by expiring the lease.
create table job_locks (
  name text primary key,
  holder text not null,
  locked_until timestamptz not null
);

-- Service-only table: RLS on with no policies keeps it out of the public REST API.
alter table job_locks enable row level security;
