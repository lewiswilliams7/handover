ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS recipient_name text;
