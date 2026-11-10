-- Last successful run per job: daily jobs (backup) must not re-run after a worker restart or deploy.
alter table job_locks add column last_success_at timestamptz;
