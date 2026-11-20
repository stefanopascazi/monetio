-- Batch details (#88): members who see a batch may read which movements it changed and their
-- previous values, to check a sync before undoing it.
grant select on bank_sync_batch_changes to authenticated;
create policy bank_sync_batch_changes_select on bank_sync_batch_changes for select
  using (batch_id in (select id from bank_sync_batches));
