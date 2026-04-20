-- Per-member dashboard access (Settings → Members).
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS dashboard_permission text NOT NULL DEFAULT 'full'
CHECK (dashboard_permission IN ('none', 'read', 'full'));

COMMENT ON COLUMN public.team_members.dashboard_permission IS
  'Dashboard tab access: none (no tab), read (view table only), full (detail + generate from dashboard).';
