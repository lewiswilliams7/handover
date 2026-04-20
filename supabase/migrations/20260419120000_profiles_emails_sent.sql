-- Track transactional/drip email IDs per user (append-only list of string IDs).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emails_sent jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Optional: profile signup time for drip scheduling (backfilled from auth.users).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id
  AND p.created_at IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN created_at SET DEFAULT now();

COMMENT ON COLUMN public.profiles.emails_sent IS 'JSON array of string email IDs already sent; see src/lib/emails-sent.ts';
