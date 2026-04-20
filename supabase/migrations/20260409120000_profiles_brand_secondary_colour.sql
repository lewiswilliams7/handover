-- Accent / secondary colour for Excel and branded outputs
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS brand_secondary_colour text DEFAULT '#1E40AF';
