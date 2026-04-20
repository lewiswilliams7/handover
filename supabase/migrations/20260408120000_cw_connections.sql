create table if not exists public.cw_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  site_url text not null,
  company_id text not null,
  public_key_encrypted text not null,
  private_key_encrypted text not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_cw_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cw_connections_set_updated_at on public.cw_connections;
create trigger cw_connections_set_updated_at
before update on public.cw_connections
for each row execute procedure public.set_cw_connections_updated_at();

alter table public.cw_connections enable row level security;

drop policy if exists "Users can read own cw connection" on public.cw_connections;
create policy "Users can read own cw connection"
  on public.cw_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cw connection" on public.cw_connections;
create policy "Users can insert own cw connection"
  on public.cw_connections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cw connection" on public.cw_connections;
create policy "Users can update own cw connection"
  on public.cw_connections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cw connection" on public.cw_connections;
create policy "Users can delete own cw connection"
  on public.cw_connections
  for delete
  using (auth.uid() = user_id);
