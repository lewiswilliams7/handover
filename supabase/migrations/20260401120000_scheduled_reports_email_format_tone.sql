ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS email_format text DEFAULT 'digest';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS email_tone text DEFAULT 'professional';
