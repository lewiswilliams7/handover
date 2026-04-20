ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS scheduled_report_id uuid REFERENCES public.scheduled_reports (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generations_scheduled_report_id_idx
ON public.generations (scheduled_report_id)
WHERE scheduled_report_id IS NOT NULL;
