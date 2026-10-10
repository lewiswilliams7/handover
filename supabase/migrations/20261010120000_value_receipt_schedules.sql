-- Value Receipts: monthly automatic sending, one row per client per user.
create table if not exists public.value_receipt_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id bigint not null,
  client_name text not null,
  email_to text not null,
  enabled boolean not null default true,
  last_sent_month text,
  last_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint value_receipt_schedules_user_client_key unique (user_id, client_id),
  constraint value_receipt_schedules_email_check check (email_to ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint value_receipt_schedules_month_check check (last_sent_month is null or last_sent_month ~ '^\d{4}-\d{2}$')
);

create index if not exists value_receipt_schedules_enabled_idx
  on public.value_receipt_schedules (enabled, last_sent_month);

alter table public.value_receipt_schedules enable row level security;

drop policy if exists "value_receipt_schedules_select_own" on public.value_receipt_schedules;
create policy "value_receipt_schedules_select_own" on public.value_receipt_schedules
  for select using (auth.uid() = user_id);

drop policy if exists "value_receipt_schedules_insert_own" on public.value_receipt_schedules;
create policy "value_receipt_schedules_insert_own" on public.value_receipt_schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists "value_receipt_schedules_update_own" on public.value_receipt_schedules;
create policy "value_receipt_schedules_update_own" on public.value_receipt_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "value_receipt_schedules_delete_own" on public.value_receipt_schedules;
create policy "value_receipt_schedules_delete_own" on public.value_receipt_schedules
  for delete using (auth.uid() = user_id);
