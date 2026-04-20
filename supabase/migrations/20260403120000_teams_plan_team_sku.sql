-- Unify team billing SKU to plan = 'team' (replaces team_starter / team_growth).

ALTER TABLE public.teams
  ALTER COLUMN plan SET DEFAULT 'team';

UPDATE public.teams
SET plan = 'team',
    generation_limit = GREATEST(generation_limit, 1000)
WHERE plan IN ('team_starter', 'team_growth');

UPDATE public.teams
SET generation_limit = 1000
WHERE plan = 'team' AND generation_limit < 1000;
