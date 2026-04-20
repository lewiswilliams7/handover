create table if not exists public.halopsa_waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.halopsa_waitlist enable row level security;

drop policy if exists "Allow insert halopsa waitlist" on public.halopsa_waitlist;
create policy "Allow insert halopsa waitlist"
  on public.halopsa_waitlist
  for insert
  with check (true);

drop policy if exists "Allow update own halopsa waitlist by email" on public.halopsa_waitlist;
create policy "Allow update own halopsa waitlist by email"
  on public.halopsa_waitlist
  for update
  using (true)
  with check (true);
