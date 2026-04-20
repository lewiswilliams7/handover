ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS selected_ticket_ids integer[] DEFAULT '{}';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS selected_project_ids integer[] DEFAULT '{}';
