-- Add KYC verification fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS document_type     text,
  ADD COLUMN IF NOT EXISTS document_number   text,
  ADD COLUMN IF NOT EXISTS expiry_date       text,
  ADD COLUMN IF NOT EXISTS document_images   jsonb,
  ADD COLUMN IF NOT EXISTS selfie_url        text,
  ADD COLUMN IF NOT EXISTS kyc_verified      boolean NOT NULL DEFAULT false;
