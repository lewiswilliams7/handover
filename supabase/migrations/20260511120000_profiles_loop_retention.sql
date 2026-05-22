alter table public.profiles
  add column if not exists has_completed_loop boolean not null default false;

alter table public.profiles
  add column if not exists last_generation_at timestamptz;
