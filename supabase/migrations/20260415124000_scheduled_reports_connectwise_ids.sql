alter table scheduled_reports
add column if not exists cw_ticket_ids jsonb default '[]'::jsonb;

alter table scheduled_reports
add column if not exists cw_project_ids jsonb default '[]'::jsonb;
