-- Client name for CI QBR scheduled runs (report_type = 'ci_qbr').
ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS ci_qbr_client_name text DEFAULT NULL;
