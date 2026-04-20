-- Mark existing profiles as onboarding-complete so only accounts with explicit
-- onboarding_completed = false (e.g. new signups) see the first-run overlay.
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL
   OR onboarding_completed = false;
