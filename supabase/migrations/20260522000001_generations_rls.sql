-- Enable RLS on generations table
alter table public.generations enable row level security;

-- Users can only read their own generations
create policy "Users can read own generations"
  on public.generations
  for select
  using (auth.uid() = user_id);

-- Users can only insert their own generations
create policy "Users can insert own generations"
  on public.generations
  for insert
  with check (auth.uid() = user_id);

-- Users can only update their own generations
create policy "Users can update own generations"
  on public.generations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete their own generations
create policy "Users can delete own generations"
  on public.generations
  for delete
  using (auth.uid() = user_id);

-- Service role bypasses RLS (for cron jobs and server-side operations)
-- This is automatic for service role in Supabase
