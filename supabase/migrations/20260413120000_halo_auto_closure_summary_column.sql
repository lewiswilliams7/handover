-- Audit: optional boolean name; kept in sync with auto_closure_summary_enabled in application code.
ALTER TABLE public.halo_connections
ADD COLUMN IF NOT EXISTS auto_closure_summary boolean NOT NULL DEFAULT false;

UPDATE public.halo_connections
SET auto_closure_summary = auto_closure_summary_enabled
WHERE auto_closure_summary IS DISTINCT FROM auto_closure_summary_enabled;
