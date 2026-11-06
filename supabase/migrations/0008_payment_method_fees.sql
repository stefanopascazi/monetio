-- Bank transfers (bonifico) and CBill payments are expenses that may carry a fee.
-- The fee is its own expense row linked to the payment, so it is deleted with it.
create type payment_method as enum ('bank_transfer', 'cbill');

alter table transactions
  add column payment_method payment_method,
  add column parent_transaction_id uuid references transactions(id) on delete cascade;

create index on transactions (parent_transaction_id);
