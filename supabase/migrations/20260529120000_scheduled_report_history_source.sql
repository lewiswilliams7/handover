-- Optional send source for scheduled_report_history (e.g. digest cron).
ALTER TABLE scheduled_report_history
  ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
