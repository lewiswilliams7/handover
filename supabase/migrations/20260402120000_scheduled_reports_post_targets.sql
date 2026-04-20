-- NULL = use legacy halo_push_target scope; [] = explicit “no tickets”; non-empty = explicit targets
ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS post_to_ticket_ids integer[];

ALTER TABLE scheduled_reports
  ADD COLUMN IF NOT EXISTS post_consolidated boolean DEFAULT false;
