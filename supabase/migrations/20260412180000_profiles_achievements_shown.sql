-- Track which achievement toasts have already been shown (JSON array of string ids).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS achievements_shown jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.achievements_shown IS 'String ids of achievement unlock toasts already shown; see src/lib/achievements.ts';
