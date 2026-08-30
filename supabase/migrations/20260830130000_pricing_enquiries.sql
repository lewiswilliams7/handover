create table if not exists public.pricing_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_type text not null check (enquiry_type in ('starter', 'enterprise')),
  name text not null,
  company text not null,
  email text not null,
  managed_clients text not null,
  psa text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists pricing_enquiries_created_at_idx
  on public.pricing_enquiries (created_at desc);

alter table public.pricing_enquiries enable row level security;
