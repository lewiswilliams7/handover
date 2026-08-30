ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.tour_completed IS
  'Whether the user has completed (or explicitly skipped) the post-onboarding product tour. Used to avoid re-triggering it automatically on every login.';
