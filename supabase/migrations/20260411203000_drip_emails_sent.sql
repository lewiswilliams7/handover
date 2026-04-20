-- Tracks automated drip sends (day 3 / day 7). Service role only at runtime.

CREATE TABLE IF NOT EXISTS public.drip_emails_sent (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, email_type)
);

CREATE INDEX IF NOT EXISTS drip_emails_sent_sent_at_idx
  ON public.drip_emails_sent (sent_at DESC);

COMMENT ON TABLE public.drip_emails_sent IS 'Transactional drip email log; one row per (user_id, email_type).';

ALTER TABLE public.drip_emails_sent ENABLE ROW LEVEL SECURITY;
