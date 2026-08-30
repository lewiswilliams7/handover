CREATE TABLE IF NOT EXISTS client_health_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  snapshot_date date NOT NULL,
  relationship_health text NOT NULL,
  days_since_last_report integer,
  open_risk_count integer NOT NULL DEFAULT 0,
  recurring_issue_count integer NOT NULL DEFAULT 0,
  generation_count integer NOT NULL DEFAULT 0,
  has_scheduled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_health_snapshots_unique
  ON client_health_snapshots (user_id, client_name, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_client_health_snapshots_lookup
  ON client_health_snapshots (user_id, client_name, snapshot_date DESC);

ALTER TABLE client_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own health snapshots" ON client_health_snapshots;
CREATE POLICY "Users read own health snapshots"
ON client_health_snapshots
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE client_health_snapshots IS
  'Daily point-in-time health snapshot per client, written by the
  digest cron snapshot phase, used to compute accurate deltas in
  digest emails. Not user-editable.';
