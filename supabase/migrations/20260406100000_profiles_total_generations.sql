-- Lifetime generation counter on profiles (incremented from API after each saved generation).

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_generations integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_profile_total_generations(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_generations = total_generations + 1
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_profile_total_generations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_profile_total_generations(uuid) TO service_role;

-- Backfill from existing generations rows (idempotent if re-run after new gens).
UPDATE public.profiles p
SET total_generations = COALESCE(sub.cnt, 0)
FROM (
  SELECT user_id, count(*)::integer AS cnt
  FROM public.generations
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;
