ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');

UPDATE public.teams
SET trial_ends_at = COALESCE(trial_end, created_at) + interval '14 days'
WHERE trial_ends_at IS NULL;
