-- Purchased seat count for team billing (Stripe quantity). Caps invites / members.
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS seat_limit integer NOT NULL DEFAULT 3;

UPDATE public.teams
SET seat_limit = GREATEST(3, LEAST(20, ROUND(generation_limit::numeric / 200)))
WHERE generation_limit IS NOT NULL AND generation_limit > 0;
