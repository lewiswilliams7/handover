-- Track report kind for monthly QBR caps (Professional 1/mo, Team 3/mo pooled, Enterprise unlimited).
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'external';

CREATE INDEX IF NOT EXISTS generations_user_report_type_created_idx
ON public.generations (user_id, report_type, created_at DESC);
