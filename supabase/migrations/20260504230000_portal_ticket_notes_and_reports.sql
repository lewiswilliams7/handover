-- Ticket note visibility for client portal + shared reports table.

alter table if exists portal_clients
  add column if not exists visibility_ticket_notes boolean not null default true;

create table if not exists portal_reports (
  id uuid primary key default gen_random_uuid(),
  portal_client_id uuid not null references portal_clients(id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table portal_reports enable row level security;
