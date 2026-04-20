ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS push_to_halo boolean DEFAULT false;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS halo_push_outputs text[] DEFAULT '{"client_email","actions","risks"}';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS halo_push_excel boolean DEFAULT false;

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS halo_push_excel_tabs text[] DEFAULT '{}';

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS halo_push_target text DEFAULT 'all';
