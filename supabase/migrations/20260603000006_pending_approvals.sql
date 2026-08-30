-- Queue for hold-for-review sends: fully rendered payloads awaiting manual approval.

CREATE TABLE IF NOT EXISTS pending_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('psa', 'digest', 'ci')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_user_status
  ON pending_approvals (user_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_schedule
  ON pending_approvals (schedule_id) WHERE schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires
  ON pending_approvals (expires_at) WHERE status != 'pending';

COMMENT ON TABLE pending_approvals IS
  'Holds fully-rendered report payloads awaiting manual approval
  before sending, for schedules with hold_for_review enabled.
  Resolved rows (approved/rejected/superseded) are purged after
  expires_at by a cleanup job.';

COMMENT ON COLUMN pending_approvals.payload IS
  'Fully rendered send-ready content: subject, html, text,
  recipients, from header, and PSA push config where applicable.
  Sending on approval uses this payload exactly as stored - no
  regeneration.';

ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own pending approvals" ON pending_approvals;
CREATE POLICY "Users read own pending approvals"
ON pending_approvals
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own pending approvals" ON pending_approvals;
CREATE POLICY "Users update own pending approvals"
ON pending_approvals
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
