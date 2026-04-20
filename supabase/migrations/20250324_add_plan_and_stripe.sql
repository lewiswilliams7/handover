-- Run in Supabase SQL Editor before using Stripe billing features.
-- Safe to re-run: uses IF NOT EXISTS where supported.

-- Billing: plan + Stripe customer ID (profiles.id = auth.users.id)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Monthly usage counts (ensure timestamp exists)
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS generations_user_id_created_at_idx
  ON public.generations (user_id, created_at DESC);
