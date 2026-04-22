-- Add missing columns to withdrawal_requests
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by        TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT;

-- Fix status constraint to include 'approved'
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_status_check
  CHECK (status IN ('pending', 'processing', 'approved', 'completed', 'rejected'));

-- Fix amount constraint to allow minimum £2
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_check;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_amount_check
  CHECK (amount >= 2);
