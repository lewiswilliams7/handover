ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS ticket_client_ids integer[] DEFAULT '{}';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS project_client_ids integer[] DEFAULT '{}';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS ticket_all_clients boolean DEFAULT true;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS project_all_clients boolean DEFAULT true;
