-- Referral scheme (run in Supabase SQL editor or via migration)
-- Referral codes: one per paying customer; created via service role (webhook)

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referral code"
ON public.referral_codes FOR SELECT
USING (auth.uid() = user_id);

-- Inserts are performed by the Stripe webhook (service role only).

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  referred_email text,
  referred_signed_up_at timestamptz,
  referred_converted_at timestamptz,
  reward_applied_at timestamptz,
  stripe_coupon_applied text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_id_key
ON public.referrals (referred_id)
WHERE referred_id IS NOT NULL;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_coupon_used boolean NOT NULL DEFAULT false;
