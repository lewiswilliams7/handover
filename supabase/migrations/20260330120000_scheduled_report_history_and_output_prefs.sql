-- History of sent scheduled reports + output preferences on schedule row.

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS email_content_prefs jsonb DEFAULT '{}'::jsonb;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS attach_excel boolean DEFAULT true;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS excel_tabs text[] DEFAULT ARRAY[
    'actions','risks','summary','client_email','status_report'
  ];

CREATE TABLE IF NOT EXISTS scheduled_report_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES scheduled_reports (id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now(),
  email_to text,
  tickets_processed integer DEFAULT 0,
  clients_covered text[],
  status text DEFAULT 'sent',
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_history_user_sent
  ON scheduled_report_history (user_id, sent_at DESC);

ALTER TABLE scheduled_report_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own scheduled report history" ON scheduled_report_history;
CREATE POLICY "Users read own scheduled report history"
ON scheduled_report_history
FOR SELECT
USING (auth.uid() = user_id);
