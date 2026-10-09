alter table public.scan_finding_dismissals
  alter column scan_session_id drop not null;

alter table public.scan_finding_dismissals
  drop constraint if exists scan_finding_dismissals_scan_session_id_fkey;

alter table public.scan_finding_dismissals
  add constraint scan_finding_dismissals_scan_session_id_fkey
  foreign key (scan_session_id)
  references public.scan_sessions(id)
  on delete set null;

alter table public.scan_finding_dismissals
  add column if not exists raised_at timestamptz;

alter table public.scan_finding_dismissals
  add column if not exists client_name text;

alter table public.scan_finding_dismissals
  add column if not exists drivers_at_raise jsonb not null default '[]'::jsonb;

alter table public.scan_finding_dismissals
  add column if not exists monthly_value numeric;

alter table public.scan_finding_dismissals
  add column if not exists actioned boolean not null default false;

alter table public.scan_finding_dismissals
  add column if not exists action_type text;

alter table public.scan_finding_dismissals
  add column if not exists action_note text;

alter table public.scan_finding_dismissals
  add column if not exists actioned_at timestamptz;

alter table public.scan_finding_dismissals
  add column if not exists outcome_status text not null default 'pending';

alter table public.scan_finding_dismissals
  add column if not exists outcome_due_at timestamptz;

alter table public.scan_finding_dismissals
  add column if not exists outcome_at timestamptz;

alter table public.scan_finding_dismissals
  add column if not exists outcome_scan_session_id uuid;

update public.scan_finding_dismissals as ledger
set raised_at = coalesce(s.created_at, ledger.created_at),
    actioned = true,
    action_type = coalesce(ledger.action_type, 'normal_for_client'),
    actioned_at = coalesce(ledger.actioned_at, ledger.created_at),
    outcome_due_at = coalesce(
      ledger.outcome_due_at,
      coalesce(s.created_at, ledger.created_at) + interval '90 days'
    )
from public.scan_sessions as s
where ledger.scan_session_id = s.id
  and (
    ledger.raised_at is null
    or ledger.action_type is null
    or ledger.actioned_at is null
    or ledger.outcome_due_at is null
  );

update public.scan_finding_dismissals
set raised_at = coalesce(raised_at, created_at),
    outcome_due_at = coalesce(outcome_due_at, coalesce(raised_at, created_at) + interval '90 days')
where raised_at is null
   or outcome_due_at is null;

alter table public.scan_finding_dismissals
  alter column raised_at set not null,
  alter column outcome_due_at set not null;

alter table public.scan_finding_dismissals
  drop constraint if exists scan_finding_dismissals_action_type_check;

alter table public.scan_finding_dismissals
  add constraint scan_finding_dismissals_action_type_check
  check (action_type is null or action_type in ('normal_for_client', 'add_to_qbr', 'handled'));

alter table public.scan_finding_dismissals
  drop constraint if exists scan_finding_dismissals_outcome_status_check;

alter table public.scan_finding_dismissals
  add constraint scan_finding_dismissals_outcome_status_check
  check (outcome_status in ('pending', 'resolved', 'still_open'));

alter table public.scan_finding_dismissals
  drop constraint if exists scan_finding_dismissals_action_note_length_check;

alter table public.scan_finding_dismissals
  add constraint scan_finding_dismissals_action_note_length_check
  check (action_note is null or char_length(action_note) <= 240);

alter table public.scan_finding_dismissals
  drop constraint if exists scan_finding_dismissals_outcome_scan_session_id_fkey;

alter table public.scan_finding_dismissals
  add constraint scan_finding_dismissals_outcome_scan_session_id_fkey
  foreign key (outcome_scan_session_id)
  references public.scan_sessions(id)
  on delete set null;

create index if not exists scan_finding_dismissals_history_idx
  on public.scan_finding_dismissals (user_id, raised_at desc, client_id, finding_type);

create index if not exists scan_finding_dismissals_open_idx
  on public.scan_finding_dismissals (user_id, actioned, outcome_status, raised_at desc);
