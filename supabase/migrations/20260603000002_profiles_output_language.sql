ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS output_language text DEFAULT 'English';

COMMENT ON COLUMN public.profiles.output_language IS 'Preferred language for generated client outputs (onboarding / settings).';
