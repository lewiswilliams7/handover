create table if not exists public.scan_finding_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_session_id uuid not null references public.scan_sessions(id) on delete cascade,
  client_id bigint not null,
  finding_type text not null,
  reason text not null default 'normal_for_client',
  created_at timestamptz not null default now(),
  unique (user_id, scan_session_id, client_id, finding_type)
);

create index if not exists scan_finding_dismissals_user_idx
  on public.scan_finding_dismissals (user_id, created_at desc);

alter table public.scan_finding_dismissals enable row level security;

create policy "Users can read their own scan finding dismissals"
  on public.scan_finding_dismissals
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own scan finding dismissals"
  on public.scan_finding_dismissals
  for insert
  with check (auth.uid() = user_id);
