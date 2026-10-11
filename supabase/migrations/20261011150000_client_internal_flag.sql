-- Let the MSP mark a client as "not a client" (their own company, a test client).
-- Internal rows carry no monthly value; every other row still needs one.
alter table public.client_value_overrides
  add column if not exists is_internal boolean not null default false;

alter table public.client_value_overrides
  alter column monthly_value drop not null;

alter table public.client_value_overrides
  drop constraint if exists client_value_overrides_monthly_value_check;

alter table public.client_value_overrides
  drop constraint if exists client_value_overrides_value_check;

alter table public.client_value_overrides
  add constraint client_value_overrides_value_check check (
    is_internal or (monthly_value is not null and monthly_value > 0 and monthly_value < 10000000)
  );
