alter table public.scan_sessions
  add column if not exists results_expires_at timestamptz;

create index if not exists scan_sessions_results_expiry_idx
  on public.scan_sessions (results_expires_at);

-- Preserve completed results created before this split-lifetime policy.
update public.scan_sessions
set results_expires_at = greatest(expires_at, created_at) + interval '7 days'
where status in ('complete', 'claimed')
  and results_json is not null
  and results_expires_at is null;

-- Credentials must not remain on completed rows or past their original deadline.
update public.scan_sessions
set credentials_encrypted = null
where credentials_encrypted is not null
  and (expires_at <= timezone('utc', now()) or status in ('complete', 'claimed'));

create or replace function public.cleanup_expired_scan_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  current_deleted integer;
begin
  -- Remove credentials at their original deadline even when a completed
  -- result is retained for claiming.
  update public.scan_sessions
  set credentials_encrypted = null
  where credentials_encrypted is not null
    and expires_at <= timezone('utc', now());

  -- Expired work-in-progress rows have no claimable result.
  delete from public.scan_sessions
  where status not in ('complete', 'claimed')
    and expires_at <= timezone('utc', now());
  get diagnostics current_deleted = row_count;
  deleted_count := current_deleted;

  -- Completed rows survive the one-hour credential lifetime until their
  -- seven-day result lifetime ends.
  delete from public.scan_sessions
  where status in ('complete', 'claimed')
    and (
      results_expires_at is null
      or results_expires_at <= timezone('utc', now())
    );
  get diagnostics current_deleted = row_count;
  deleted_count := deleted_count + current_deleted;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_scan_sessions() from public;
grant execute on function public.cleanup_expired_scan_sessions() to service_role;

drop function if exists public.issue_scan_session(text, text, text, text, text, timestamptz);

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

  update public.scan_sessions
  set credentials_encrypted = null
  where credentials_encrypted is not null
    and expires_at <= timezone('utc', now());

  delete from public.scan_sessions
  where (
    status not in ('complete', 'claimed')
    and expires_at <= timezone('utc', now())
  ) or (
    status in ('complete', 'claimed')
    and (
      results_expires_at is null
      or results_expires_at <= timezone('utc', now())
    )
  );

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
