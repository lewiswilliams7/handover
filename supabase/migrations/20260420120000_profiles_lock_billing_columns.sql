-- Lock billing-related columns on profiles: only service role (API routes / webhooks) may change them.
-- Authenticated users may still update names, preferences, onboarding flags, etc.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Inserts are performed via service role (e.g. ensureProfileFromAuthUser); no INSERT for authenticated.

CREATE OR REPLACE FUNCTION public.profiles_lock_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Service role JWT or non-PostgREST contexts (migrations, cron SQL) skip enforcement.
    IF (auth.jwt() ->> 'role') = 'service_role' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
      OR NEW.trial_plan IS DISTINCT FROM OLD.trial_plan
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    THEN
      RAISE EXCEPTION 'billing fields cannot be updated from the client'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF (auth.jwt() ->> 'role') = 'service_role' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL THEN
      NEW.plan := COALESCE(NEW.plan, 'free');
      NEW.trial_ends_at := NULL;
      NEW.trial_plan := NULL;
      NEW.stripe_customer_id := NULL;
      NEW.subscription_status := NULL;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_billing_columns_trigger ON public.profiles;
CREATE TRIGGER profiles_lock_billing_columns_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.profiles_lock_billing_columns();
