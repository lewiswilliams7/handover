CREATE TABLE IF NOT EXISTS custom_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  psa text NOT NULL CHECK (psa IN ('halopsa', 'connectwise')),
  field_name text NOT NULL,
  display_name text NOT NULL,
  outputs text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_field_mappings_user_id_idx ON custom_field_mappings(user_id);
ALTER TABLE custom_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mappings" ON custom_field_mappings
  FOR ALL USING (auth.uid() = user_id);
