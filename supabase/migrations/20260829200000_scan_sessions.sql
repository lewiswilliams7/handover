create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '60 minutes'),
  psa_type text not null check (psa_type in ('halo', 'connectwise')),
  session_token_hash text not null unique,
  ip_fingerprint text,
  credentials_encrypted text,
  status text not null default 'pending'
    check (status in ('pending', 'syncing', 'complete', 'failed', 'claimed')),
  progress_json jsonb not null default '{}'::jsonb,
  results_json jsonb,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  error_reason text
);

create index if not exists scan_sessions_expiry_idx
  on public.scan_sessions (expires_at);

create index if not exists scan_sessions_status_idx
  on public.scan_sessions (status, created_at);

alter table public.scan_sessions enable row level security;

revoke all on table public.scan_sessions from anon;
revoke all on table public.scan_sessions from authenticated;

grant select (
  id,
  created_at,
  expires_at,
  psa_type,
  status,
  progress_json,
  results_json,
  claimed_by_user_id,
  error_reason
) on public.scan_sessions to authenticated;

drop policy if exists scan_sessions_claimant_read on public.scan_sessions;
create policy scan_sessions_claimant_read
  on public.scan_sessions
  for select
  to authenticated
  using (
    claimed_by_user_id = (select auth.uid())
    and status = 'claimed'
  );

create or replace function public.cleanup_expired_scan_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.scan_sessions
  where expires_at <= timezone('utc', now());
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_scan_sessions() from public;
grant execute on function public.cleanup_expired_scan_sessions() to service_role;

create or replace function public.issue_scan_session(
  p_psa_type text,
  p_session_token_hash text,
  p_ip_fingerprint text,
  p_credentials_encrypted text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('scan_sessions_capacity'));

  delete from public.scan_sessions
  where expires_at <= timezone('utc', now());

  if (
    select count(*)
    from public.scan_sessions
    where status in ('pending', 'syncing')
      and expires_at > timezone('utc', now())
  ) >= 50 then
    raise exception using message = 'scan_capacity_reached';
  end if;

  insert into public.scan_sessions (
    psa_type,
    session_token_hash,
    ip_fingerprint,
    credentials_encrypted,
    expires_at
  )
  values (
    p_psa_type,
    p_session_token_hash,
    p_ip_fingerprint,
    p_credentials_encrypted,
    p_expires_at
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.issue_scan_session(text, text, text, text, timestamptz) from public;
grant execute on function public.issue_scan_session(text, text, text, text, timestamptz) to service_role;
