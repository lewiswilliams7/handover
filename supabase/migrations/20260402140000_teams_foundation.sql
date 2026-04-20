-- Teams foundation: billing pool, members, invites, profile.team_id.
-- Order: teams → team_members → RLS policies → team_invites → profiles → RPC

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'team_starter',
  stripe_customer_id text,
  subscription_status text DEFAULT 'trialing',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_count integer NOT NULL DEFAULT 0,
  generation_limit integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members (user_id);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id),
  email text,
  token text UNIQUE NOT NULL DEFAULT (gen_random_uuid()::text),
  role text NOT NULL DEFAULT 'member',
  accepted boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites (team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites (token);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can read their team" ON public.teams;
CREATE POLICY "Team members can read their team"
ON public.teams FOR SELECT
USING (
  id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Team owners can update their team" ON public.teams;
CREATE POLICY "Team owners can update their team"
ON public.teams FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create teams they own" ON public.teams;
CREATE POLICY "Users can create teams they own"
ON public.teams FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Members can read their own team membership" ON public.team_members;
CREATE POLICY "Members can read their own team membership"
ON public.team_members FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all members in their team" ON public.team_members;
CREATE POLICY "Admins can read all members in their team"
ON public.team_members FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can update members in their team" ON public.team_members;
CREATE POLICY "Admins can update members in their team"
ON public.team_members FOR UPDATE
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can select invites for their team" ON public.team_invites;
CREATE POLICY "Admins can select invites for their team"
ON public.team_invites FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can insert invites for their team" ON public.team_invites;
CREATE POLICY "Admins can insert invites for their team"
ON public.team_invites FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can update invites for their team" ON public.team_invites;
CREATE POLICY "Admins can update invites for their team"
ON public.team_invites FOR UPDATE
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can delete invites for their team" ON public.team_invites;
CREATE POLICY "Admins can delete invites for their team"
ON public.team_invites FOR DELETE
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_team_id_idx ON public.profiles (team_id) WHERE team_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_teams_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
CREATE TRIGGER teams_set_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE PROCEDURE public.set_teams_updated_at();

-- Atomic team generation increment (service_role only). Returns ok=false when over limit.
CREATE OR REPLACE FUNCTION public.try_increment_team_generation(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.teams%ROWTYPE;
BEGIN
  UPDATE public.teams
  SET generation_count = generation_count + 1
  WHERE id = p_team_id AND generation_count < generation_limit
  RETURNING * INTO rec;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'generation_count', rec.generation_count,
      'generation_limit', rec.generation_limit
    );
  END IF;

  SELECT * INTO rec FROM public.teams WHERE id = p_team_id;
  IF rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'team_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'error', 'limit_reached',
    'generation_count', rec.generation_count,
    'generation_limit', rec.generation_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.try_increment_team_generation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_increment_team_generation(uuid) TO service_role;
