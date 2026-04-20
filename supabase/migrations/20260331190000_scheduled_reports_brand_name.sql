ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS brand_name text;
