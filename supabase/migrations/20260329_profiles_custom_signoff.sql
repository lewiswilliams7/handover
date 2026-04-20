-- Optional sign-off text separate from full signature block (profiles.id = auth.users.id)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_signoff text;
