-- Optional PM tab toggles and other output UI preferences (JSON).
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS output_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.output_preferences IS 'JSON e.g. {"extendedTabs":["raid_log","meeting_notes"]}';
