-- Trial tracking for Professional / Team signup (no payment)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_plan text;
