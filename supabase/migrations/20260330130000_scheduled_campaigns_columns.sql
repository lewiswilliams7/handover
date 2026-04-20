-- Multi-schedule campaigns: allow multiple rows per user + add campaign columns.

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_one_per_user;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS name text
    DEFAULT 'Weekly Report';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'external';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS include_tickets boolean DEFAULT true;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS include_projects boolean DEFAULT true;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS is_note_to_self boolean DEFAULT false;

-- These were added previously by another migration; kept here for completeness.
ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS email_content_prefs jsonb DEFAULT '{}'::jsonb;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS attach_excel boolean DEFAULT true;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS excel_tabs text[] DEFAULT ARRAY[
    'actions','risks','summary','client_email','status_report'
  ];

