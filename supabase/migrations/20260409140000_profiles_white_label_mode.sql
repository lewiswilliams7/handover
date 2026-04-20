ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS white_label_mode boolean DEFAULT false;
