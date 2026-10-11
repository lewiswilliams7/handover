-- Monthly values typed in by the MSP for clients whose PSA holds no contract value.
create table if not exists public.client_value_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null,
  client_name text not null default '',
  monthly_value numeric(12, 2) not null check (monthly_value > 0 and monthly_value < 10000000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_value_overrides_user_client_key unique (user_id, client_id)
);

alter table public.client_value_overrides enable row level security;

drop policy if exists "client_value_overrides_select_own" on public.client_value_overrides;
create policy "client_value_overrides_select_own" on public.client_value_overrides
  for select using (auth.uid() = user_id);
drop policy if exists "client_value_overrides_insert_own" on public.client_value_overrides;
create policy "client_value_overrides_insert_own" on public.client_value_overrides
  for insert with check (auth.uid() = user_id);
drop policy if exists "client_value_overrides_update_own" on public.client_value_overrides;
create policy "client_value_overrides_update_own" on public.client_value_overrides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "client_value_overrides_delete_own" on public.client_value_overrides;
create policy "client_value_overrides_delete_own" on public.client_value_overrides
  for delete using (auth.uid() = user_id);

-- Monday Brief: one row per user. No row means the brief is on.
create table if not exists public.monday_brief_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  last_sent_week text,
  last_sent_at timestamptz,
  last_alert_scan_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monday_brief_settings_week_check check (last_sent_week is null or last_sent_week ~ '^\d{4}-W\d{2}$')
);

alter table public.monday_brief_settings enable row level security;

drop policy if exists "monday_brief_settings_select_own" on public.monday_brief_settings;
create policy "monday_brief_settings_select_own" on public.monday_brief_settings
  for select using (auth.uid() = user_id);
drop policy if exists "monday_brief_settings_insert_own" on public.monday_brief_settings;
create policy "monday_brief_settings_insert_own" on public.monday_brief_settings
  for insert with check (auth.uid() = user_id);
drop policy if exists "monday_brief_settings_update_own" on public.monday_brief_settings;
create policy "monday_brief_settings_update_own" on public.monday_brief_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Headline numbers kept per scan, so trends survive after scan results expire.
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_session_id uuid not null,
  scanned_at timestamptz not null,
  revenue_at_risk_annual numeric(14, 2) not null default 0,
  clients_at_risk integer not null default 0,
  renewals_90_annual numeric(14, 2) not null default 0,
  saved_revenue_annual numeric(14, 2) not null default 0,
  clients_monitored integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint portfolio_snapshots_scan_key unique (user_id, scan_session_id)
);

create index if not exists portfolio_snapshots_user_time_idx
  on public.portfolio_snapshots (user_id, scanned_at desc);

alter table public.portfolio_snapshots enable row level security;

drop policy if exists "portfolio_snapshots_select_own" on public.portfolio_snapshots;
create policy "portfolio_snapshots_select_own" on public.portfolio_snapshots
  for select using (auth.uid() = user_id);
