-- Decreasing estimates: an estimate rule can be reduced by the movements booked in the month
-- on its account in some categories. An empty list keeps the estimate fixed (the default).
alter table recurring_rules add column decrement_category_ids uuid[] not null default '{}';

-- Movements the user keeps out of decreasing estimates even when their category matches.
alter table transactions add column skip_estimates boolean not null default false;
