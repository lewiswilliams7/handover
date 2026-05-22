-- Optional columns for client portal auth and MSP notification toggles.
-- Safe to run if columns already exist (IF NOT EXISTS).

alter table if exists portal_client_users
  add column if not exists password_reset_token text;

alter table if exists portal_client_users
  add column if not exists password_reset_expires_at timestamptz;

alter table if exists portal_clients
  add column if not exists notify_ticket_updates boolean default true;

alter table if exists portal_clients
  add column if not exists notify_project_updates boolean default true;
