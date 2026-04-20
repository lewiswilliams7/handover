-- Optional trial end for team trial banner (set by app/webhook when known)
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS trial_end timestamptz;
