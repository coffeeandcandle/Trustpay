ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS location   TEXT;
