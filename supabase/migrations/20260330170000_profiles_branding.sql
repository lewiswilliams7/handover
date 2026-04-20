ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS brand_name text,
ADD COLUMN IF NOT EXISTS brand_colour text DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS brand_logo_url text;
