-- Corrective schema for client_intelligence_summaries.
-- 20260529000001 altered this table before 20260603000003 created it on fresh installs,
-- so summary_type / qbr_months and uq_ci_summaries_cache may be missing on live DBs.

ALTER TABLE public.client_intelligence_summaries
  ADD COLUMN IF NOT EXISTS summary_type text NOT NULL DEFAULT 'summary';

ALTER TABLE public.client_intelligence_summaries
  ADD COLUMN IF NOT EXISTS qbr_months integer;

ALTER TABLE public.client_intelligence_summaries
  DROP CONSTRAINT IF EXISTS client_intelligence_summaries_user_id_client_name_period_from_period_to_key;

ALTER TABLE public.client_intelligence_summaries
  DROP CONSTRAINT IF EXISTS uq_ci_summaries_cache;

ALTER TABLE public.client_intelligence_summaries
  ADD CONSTRAINT uq_ci_summaries_cache
  UNIQUE NULLS NOT DISTINCT (user_id, client_name, summary_type, period_from, period_to, qbr_months);

COMMENT ON COLUMN public.client_intelligence_summaries.summary_type IS
  'Distinguishes account summary rows (summary) from QBR cache rows (qbr). Added via corrective migration after original 20260529000001 ALTER ran before this table existed on fresh installs.';
