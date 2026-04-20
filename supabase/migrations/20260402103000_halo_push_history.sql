CREATE TABLE IF NOT EXISTS halo_push_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  generation_id uuid,
  ticket_ids integer[],
  outputs_pushed text[],
  excel_attached boolean DEFAULT false,
  pushed_at timestamptz DEFAULT now(),
  success boolean DEFAULT true
);

ALTER TABLE halo_push_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own pushes" ON halo_push_history;
CREATE POLICY "Users view own pushes"
ON halo_push_history FOR ALL
USING (auth.uid() = user_id);
