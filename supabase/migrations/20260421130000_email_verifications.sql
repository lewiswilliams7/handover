CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz NOT NULL
);

CREATE INDEX email_verifications_user_id_idx ON public.email_verifications (user_id);
CREATE INDEX email_verifications_token_idx ON public.email_verifications (token);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verification"
ON public.email_verifications
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE public.email_verifications IS 'Custom email verification (Resend); Supabase built-in confirm email disabled.';
