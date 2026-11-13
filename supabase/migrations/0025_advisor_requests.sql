-- AI advisor log (#39): one row per question, to judge answer quality (rating) and real cost over time.
-- Questions and answers stay private to their author; the engine verdict is kept as JSON for review.

create table advisor_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  question text not null check (char_length(question) between 1 and 1000),
  answer text,
  -- Engine verdict of the last assess_goal call (outcome, levers, lowest point), null when none ran.
  verdict jsonb,
  refused boolean not null default false,
  model text not null,
  stop_reason text,
  -- Set when the call failed (no answer): error class only, no payload.
  error text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  -- Estimated cost in millionths of a dollar at list prices; null for a model without a known price.
  cost_micro_usd bigint,
  duration_ms integer,
  tool_calls smallint not null default 0,
  -- Author's feedback: 1 = useful, -1 = wrong or useless.
  rating smallint check (rating in (-1, 1)),
  rated_at timestamptz
);
create index on advisor_requests (user_id, created_at desc);
create index on advisor_requests (household_id, created_at desc);

alter table advisor_requests enable row level security;
create policy advisor_requests_select on advisor_requests for select using (user_id = auth.uid());
create policy advisor_requests_insert on advisor_requests for insert
  with check (user_id = auth.uid() and is_household_member(household_id));
create policy advisor_requests_update on advisor_requests for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy advisor_requests_delete on advisor_requests for delete using (user_id = auth.uid());
revoke all on advisor_requests from anon, authenticated;
grant select, insert, delete on advisor_requests to authenticated;
-- Only the feedback can change after the fact.
grant update (rating, rated_at) on advisor_requests to authenticated;
