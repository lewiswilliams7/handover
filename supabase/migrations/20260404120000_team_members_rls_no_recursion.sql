-- Avoid RLS infinite recursion on team_members / team_invites when policies
-- subquery the same table. Use SECURITY DEFINER helpers (bypass RLS) for admin checks.

CREATE OR REPLACE FUNCTION public.team_member_is_admin_or_owner(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.team_member_is_admin_or_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_member_is_admin_or_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Team members can read their team" ON public.teams;
CREATE POLICY "Team members can read their team"
ON public.teams FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can read their own team membership" ON public.team_members;
CREATE POLICY "Members can read their own team membership"
ON public.team_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all members in their team" ON public.team_members;
CREATE POLICY "Admins can read all members in their team"
ON public.team_members FOR SELECT
TO authenticated
USING (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can update members in their team" ON public.team_members;
CREATE POLICY "Admins can update members in their team"
ON public.team_members FOR UPDATE
TO authenticated
USING (public.team_member_is_admin_or_owner(team_id, auth.uid()))
WITH CHECK (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can select invites for their team" ON public.team_invites;
CREATE POLICY "Admins can select invites for their team"
ON public.team_invites FOR SELECT
TO authenticated
USING (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can insert invites for their team" ON public.team_invites;
CREATE POLICY "Admins can insert invites for their team"
ON public.team_invites FOR INSERT
TO authenticated
WITH CHECK (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can update invites for their team" ON public.team_invites;
CREATE POLICY "Admins can update invites for their team"
ON public.team_invites FOR UPDATE
TO authenticated
USING (public.team_member_is_admin_or_owner(team_id, auth.uid()))
WITH CHECK (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can delete invites for their team" ON public.team_invites;
CREATE POLICY "Admins can delete invites for their team"
ON public.team_invites FOR DELETE
TO authenticated
USING (public.team_member_is_admin_or_owner(team_id, auth.uid()));

DROP POLICY IF EXISTS "Team owners can update their team" ON public.teams;
CREATE POLICY "Team owners can update their team"
ON public.teams FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create teams they own" ON public.teams;
CREATE POLICY "Users can create teams they own"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());
