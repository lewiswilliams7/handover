-- Scheduled weekly reports (Pro). Run in Supabase if not applied via migration pipeline.
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  schedule_day text DEFAULT 'monday',
  schedule_time text DEFAULT '07:00',
  client_ids integer[] DEFAULT '{}',
  email_to text,
  include_tabs text[] DEFAULT ARRAY['actions','risks','summary','client_email','status_report'],
  date_range text DEFAULT 'last_7_days',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT scheduled_reports_one_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_enabled_next
  ON scheduled_reports (enabled, next_run_at)
  WHERE enabled = true;

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own schedules" ON scheduled_reports;
CREATE POLICY "Users manage own schedules"
ON scheduled_reports
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
