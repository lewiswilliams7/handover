-- Client portal analytics visibility flags.

alter table if exists portal_clients
  add column if not exists visibility_stats boolean not null default true;

alter table if exists portal_clients
  add column if not exists visibility_priority_breakdown boolean not null default true;

alter table if exists portal_clients
  add column if not exists visibility_resolved_count boolean not null default false;

alter table if exists portal_clients
  add column if not exists visibility_recent_activity boolean not null default true;
