-- Recurring rules can be paid by bonifico/CBill with a fixed fee per occurrence:
-- booking an occurrence also books the fee as a linked expense row.
alter table recurring_rules
  add column payment_method payment_method,
  add column fee_cents bigint not null default 0 check (fee_cents >= 0);
