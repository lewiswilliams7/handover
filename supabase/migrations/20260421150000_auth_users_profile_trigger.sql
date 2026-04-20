-- Safety net: every new auth.users row gets a public.profiles row (even if app code fails).
-- Run in Supabase SQL Editor if migrations are not applied to hosted projects.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display text;
BEGIN
  v_display := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
  );

  INSERT INTO public.profiles (id, email, plan, created_at, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    COALESCE(NEW.created_at, now()),
    NULLIF(v_display, '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Inserts profiles row when auth.users row is created; idempotent via ON CONFLICT DO NOTHING.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();
