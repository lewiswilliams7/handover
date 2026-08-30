alter table public.profiles
  add column if not exists scan_claim_redirect_pending boolean not null default false;

create index if not exists profiles_scan_claim_redirect_pending_idx
  on public.profiles (id)
  where scan_claim_redirect_pending = true;
