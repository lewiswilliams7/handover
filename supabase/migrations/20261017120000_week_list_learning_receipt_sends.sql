-- The This week list: who owns each row and where it is up to.
create table if not exists public.week_item_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (char_length(item_key) between 3 and 120),
  client_id bigint,
  status text not null default 'open' check (status in ('open', 'doing', 'done', 'snoozed')),
  owner_name text check (owner_name is null or char_length(owner_name) <= 80),
  snoozed_until timestamptz,
  done_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, item_key)
);

-- What the MSP told Handover about a warning sign. Drives the learning loop:
-- "normal for this client" hides that sign for that client until expires_at,
-- and a run of "not useful" or "normal" answers on one kind of sign lowers it
-- in the list for this MSP.
create table if not exists public.signal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null,
  client_name text not null default '',
  finding_type text not null check (char_length(finding_type) <= 60),
  scan_session_id uuid,
  verdict text not null check (verdict in ('worth_knowing', 'handled', 'normal_for_client', 'not_useful')),
  reason text check (reason is null or char_length(reason) <= 60),
  note text check (note is null or char_length(note) <= 240),
  expires_at timestamptz,
  undone_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists signal_feedback_user_idx on public.signal_feedback (user_id, finding_type, created_at desc);

-- When the MSP undoes a "Handover learned" change, the kind of sign is kept at full weight.
create table if not exists public.signal_type_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  finding_type text not null check (char_length(finding_type) <= 60),
  mode text not null default 'keep' check (mode in ('keep')),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, finding_type)
);

-- Ground truth: clients the MSP says they lost (or kept after a scare). Feeds
-- the precision scorecard alongside Churn Replay.
create table if not exists public.client_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null,
  client_name text not null default '',
  outcome text not null check (outcome in ('lost', 'downsized')),
  reason text check (reason is null or char_length(reason) <= 60),
  note text check (note is null or char_length(note) <= 240),
  occurred_on date not null default (timezone('utc', now()))::date,
  monthly_value numeric(12, 2),
  created_at timestamptz not null default timezone('utc', now()),
  constraint client_outcomes_user_client_key unique (user_id, client_id)
);

-- Every Value Receipt sent, so opens can be tracked and quiet clients spotted.
create table if not exists public.value_receipt_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null,
  client_name text not null default '',
  recipient text not null,
  period text not null default 'month' check (period in ('month', 'quarter')),
  period_label text not null default '',
  sent_at timestamptz not null default timezone('utc', now()),
  opened_at timestamptz,
  open_count integer not null default 0
);
create index if not exists value_receipt_sends_user_client_idx on public.value_receipt_sends (user_id, client_id, sent_at desc);

alter table public.week_item_states enable row level security;
alter table public.signal_feedback enable row level security;
alter table public.signal_type_settings enable row level security;
alter table public.client_outcomes enable row level security;
alter table public.value_receipt_sends enable row level security;

do $$
declare t text;
begin
  foreach t in array array['week_item_states', 'signal_feedback', 'signal_type_settings', 'client_outcomes', 'value_receipt_sends'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;
