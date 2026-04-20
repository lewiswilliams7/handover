-- Incoming webhook URLs for optional Slack / Microsoft Teams notifications after report generation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS slack_webhook_url text,
ADD COLUMN IF NOT EXISTS slack_notifications_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_webhook_url text,
ADD COLUMN IF NOT EXISTS teams_notifications_enabled boolean DEFAULT false;
