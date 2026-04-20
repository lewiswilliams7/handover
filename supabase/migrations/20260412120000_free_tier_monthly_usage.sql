-- Tracks per-user UTC-month caps for free tier (Halo push-back, scheduled report runs).
CREATE TABLE IF NOT EXISTS public.free_tier_monthly_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  month text NOT NULL DEFAULT (to_char (timezone('utc', now()), 'YYYY-MM')),
  halo_push_count integer NOT NULL DEFAULT 0,
  scheduled_run_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_tier_monthly_usage_month_idx
ON public.free_tier_monthly_usage (month);

ALTER TABLE public.free_tier_monthly_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own free tier usage" ON public.free_tier_monthly_usage;
CREATE POLICY "Users manage own free tier usage"
ON public.free_tier_monthly_usage
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
