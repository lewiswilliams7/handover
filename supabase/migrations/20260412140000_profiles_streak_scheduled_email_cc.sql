-- Generation streak (UTC calendar days) + scheduled report CC/BCC

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_generation_date date;

ALTER TABLE public.scheduled_reports
  ADD COLUMN IF NOT EXISTS email_cc text,
  ADD COLUMN IF NOT EXISTS email_bcc text;

CREATE OR REPLACE FUNCTION public.apply_generation_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_current int;
  v_longest int;
  v_today date := (timezone('utc', now()))::date;
  v_new_current int;
  v_milestone int := NULL;
  v_day_changed boolean := false;
  v_new_longest int;
BEGIN
  SELECT last_generation_date, current_streak, longest_streak
  INTO v_last, v_current, v_longest
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'milestone', NULL,
      'day_changed', false
    );
  END IF;

  v_current := COALESCE(v_current, 0);
  v_longest := COALESCE(v_longest, 0);

  IF v_last IS NULL THEN
    v_new_current := 1;
    v_day_changed := true;
  ELSIF v_last = v_today THEN
    v_new_current := v_current;
    v_day_changed := false;
  ELSIF v_last = v_today - 1 THEN
    v_new_current := v_current + 1;
    v_day_changed := true;
  ELSE
    v_new_current := 1;
    v_day_changed := true;
  END IF;

  v_new_longest := GREATEST(v_longest, v_new_current);

  UPDATE public.profiles
  SET
    last_generation_date = v_today,
    current_streak = v_new_current,
    longest_streak = v_new_longest
  WHERE id = p_user_id;

  IF v_day_changed AND v_new_current IN (3, 7, 14, 30) THEN
    v_milestone := v_new_current;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', to_jsonb(v_new_current),
    'longest_streak', to_jsonb(v_new_longest),
    'milestone',
      CASE
        WHEN v_milestone IS NULL THEN 'null'::jsonb
        ELSE to_jsonb(v_milestone)
      END,
    'day_changed', to_jsonb(v_day_changed)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_generation_streak(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_generation_streak(uuid) TO service_role;
