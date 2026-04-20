alter table public.profiles
add column if not exists zapier_api_key text;

create unique index if not exists profiles_zapier_api_key_unique
on public.profiles (zapier_api_key)
where zapier_api_key is not null;

create table if not exists public.zapier_webhook_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  received_at timestamptz default now(),
  status text,
  error text,
  ticket_count integer
);
