create table if not exists public.halo_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  halo_url text not null,
  tenant text null,
  client_id text not null,
  client_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_halo_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists halo_connections_set_updated_at on public.halo_connections;
create trigger halo_connections_set_updated_at
before update on public.halo_connections
for each row execute procedure public.set_halo_connections_updated_at();

alter table public.halo_connections enable row level security;

drop policy if exists "Users can read own halo connection" on public.halo_connections;
create policy "Users can read own halo connection"
  on public.halo_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own halo connection" on public.halo_connections;
create policy "Users can insert own halo connection"
  on public.halo_connections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own halo connection" on public.halo_connections;
create policy "Users can update own halo connection"
  on public.halo_connections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own halo connection" on public.halo_connections;
create policy "Users can delete own halo connection"
  on public.halo_connections
  for delete
  using (auth.uid() = user_id);
