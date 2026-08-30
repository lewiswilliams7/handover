alter table public.scan_sessions
  add column if not exists email text;

create index if not exists scan_sessions_email_idx
  on public.scan_sessions (lower(email));

drop function if exists public.issue_scan_session(text, text, text, text, timestamptz);

create or replace function public.issue_scan_session(
  p_psa_type text,
  p_session_token_hash text,
  p_ip_fingerprint text,
  p_email text,
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
    email,
    credentials_encrypted,
    expires_at
  )
  values (
    p_psa_type,
    p_session_token_hash,
    p_ip_fingerprint,
    lower(trim(p_email)),
    p_credentials_encrypted,
    p_expires_at
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.issue_scan_session(text, text, text, text, text, timestamptz) from public;
grant execute on function public.issue_scan_session(text, text, text, text, text, timestamptz) to service_role;
