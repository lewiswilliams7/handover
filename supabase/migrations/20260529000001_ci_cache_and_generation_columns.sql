-- Distinguish CI summary vs QBR cache rows; generation-level compare + smart-action caches

ALTER TABLE public.client_intelligence_summaries
  ADD COLUMN IF NOT EXISTS summary_type text NOT NULL DEFAULT 'summary';

ALTER TABLE public.client_intelligence_summaries
  ADD COLUMN IF NOT EXISTS qbr_months integer;

ALTER TABLE public.client_intelligence_summaries
  DROP CONSTRAINT IF EXISTS client_intelligence_summaries_user_id_client_name_period_from_period_to_key;

ALTER TABLE public.client_intelligence_summaries
  ADD CONSTRAINT uq_ci_summaries_cache
  UNIQUE NULLS NOT DISTINCT (user_id, client_name, summary_type, period_from, period_to, qbr_months);

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS compare_cache jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS smart_action_suggestions jsonb;
