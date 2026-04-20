-- HaloPSA: opt-in automatic closure summary on delivery-health refresh
ALTER TABLE public.halo_connections
ADD COLUMN IF NOT EXISTS auto_closure_summary_enabled boolean NOT NULL DEFAULT false;

-- Dedupe: one auto closure per ticket per user
CREATE TABLE IF NOT EXISTS public.halo_closure_processed (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id integer NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

ALTER TABLE public.halo_closure_processed ENABLE ROW LEVEL SECURITY;

-- Referral programme: mirror code on profile for marketing links (synced from referral_codes)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
ON public.profiles (referral_code)
WHERE referral_code IS NOT NULL;
