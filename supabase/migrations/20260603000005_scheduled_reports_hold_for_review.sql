ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS hold_for_review boolean DEFAULT false;

COMMENT ON COLUMN scheduled_reports.hold_for_review IS
  'When true, cron generates the report but holds it in pending_approvals instead of sending automatically.';
