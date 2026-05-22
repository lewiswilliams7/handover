-- portal_accounts: MSP users manage their own portal accounts
alter table public.portal_accounts enable row level security;
create policy "MSP users manage own portal account"
  on public.portal_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- portal_clients, portal_client_users, portal_client_sessions
-- These are accessed via service role only — enable RLS with no user policies
-- This means anon/authenticated keys cannot access them directly
alter table public.portal_clients enable row level security;
alter table public.portal_client_users enable row level security;
alter table public.portal_client_sessions enable row level security;
-- No user-level policies needed — service role bypasses RLS
