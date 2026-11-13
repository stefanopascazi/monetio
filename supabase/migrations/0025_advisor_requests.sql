-- AI advisor log (#39): one row per question, to judge answer quality (rating) and real cost over time,
-- grouped in conversations. Everything stays private to its author. Texts are kept 30 days (worker
-- purge) or until the author deletes them; tokens, cost and rating survive for the experiment's numbers.

create table advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on advisor_conversations (user_id, updated_at desc);

alter table advisor_conversations enable row level security;
create policy advisor_conversations_select on advisor_conversations for select using (user_id = auth.uid());
create policy advisor_conversations_insert on advisor_conversations for insert
  with check (user_id = auth.uid() and is_household_member(household_id));
create policy advisor_conversations_update on advisor_conversations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on advisor_conversations from anon, authenticated;
grant select, insert on advisor_conversations to authenticated;
grant update (title, updated_at) on advisor_conversations to authenticated;

create table advisor_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Null once the conversation is deleted or purged: the metrics below stay.
  conversation_id uuid references advisor_conversations(id) on delete set null,
  -- Position in the conversation, from 1.
  turn smallint not null default 1 check (turn >= 1),
  created_at timestamptz not null default now(),
  -- Texts are null once deleted or purged.
  question text check (question is null or char_length(question) between 1 and 1000),
  answer text,
  -- Engine verdict of the last assess_goal call (outcome, levers, lowest point), null when none ran.
  verdict jsonb,
  refused boolean not null default false,
  -- The answer checked a payment plan the user brought (shown with the stronger disclaimer).
  payment_plan boolean not null default false,
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
create index on advisor_requests (conversation_id, turn);

alter table advisor_requests enable row level security;
create policy advisor_requests_select on advisor_requests for select using (user_id = auth.uid());
create policy advisor_requests_insert on advisor_requests for insert
  with check (user_id = auth.uid() and is_household_member(household_id));
create policy advisor_requests_update on advisor_requests for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on advisor_requests from anon, authenticated;
grant select, insert on advisor_requests to authenticated;
-- Only the feedback can change after the fact.
grant update (rating, rated_at) on advisor_requests to authenticated;

-- Deletes the author's conversations (one, or all when null): texts go, metrics stay.
create or replace function delete_advisor_conversations(conversation uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  update advisor_requests set question = null, answer = null, verdict = null
  where user_id = auth.uid() and (conversation is null or conversation_id = conversation);
  delete from advisor_conversations where user_id = auth.uid() and (conversation is null or id = conversation);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function delete_advisor_conversations(uuid) from public, anon;
grant execute on function delete_advisor_conversations(uuid) to authenticated;
