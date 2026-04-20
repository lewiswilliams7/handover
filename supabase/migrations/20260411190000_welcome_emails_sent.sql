-- Dedupes founder welcome email (see runWelcomeEmailForUser); written after successful Resend send.
CREATE TABLE IF NOT EXISTS public.welcome_emails_sent (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.welcome_emails_sent IS 'One row per user after founder welcome email sent via Resend.';

-- Users who already received the legacy welcome email should not get the new one again.
INSERT INTO public.welcome_emails_sent (user_id, sent_at)
SELECT p.id, now()
FROM public.profiles p
WHERE p.welcome_email_sent IS TRUE
ON CONFLICT (user_id) DO NOTHING;
