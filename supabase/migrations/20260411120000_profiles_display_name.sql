-- Name line for client-email signatures (optional; separate from first/last used elsewhere)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text;
