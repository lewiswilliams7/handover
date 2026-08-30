-- Client intelligence summaries cache
CREATE TABLE IF NOT EXISTS public.client_intelligence_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  period_from date,
  period_to date,
  summary_json jsonb NOT NULL,
  generation_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, client_name, period_from, period_to)
);

ALTER TABLE public.client_intelligence_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_ci_summaries"
  ON public.client_intelligence_summaries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ci_summaries_user_client
  ON public.client_intelligence_summaries (user_id, client_name);

-- Add client_name extracted column to generations for faster grouping
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS client_name_extracted text GENERATED ALWAYS AS (
    CASE
      WHEN project_name ~ E'\\s*[\\u2014\\u2013-]\\s*\\d{1,2}\\s+\\w+\\s+\\d{4}$'
      THEN regexp_replace(
        project_name,
        E'\\s*[\\u2014\\u2013-]\\s*\\d{1,2}\\s+\\w+\\s+\\d{4}$',
        ''
      )
      WHEN project_name ~ E'\\s*[\\u2014\\u2013-]\\s*\\d{1,2}/\\d{1,2}/\\d{4}$'
      THEN regexp_replace(
        project_name,
        E'\\s*[\\u2014\\u2013-]\\s*\\d{1,2}/\\d{1,2}/\\d{4}$',
        ''
      )
      ELSE project_name
    END
  ) STORED;

CREATE INDEX idx_generations_client_name
  ON public.generations (user_id, client_name_extracted);
