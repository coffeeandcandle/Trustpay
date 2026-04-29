-- Add PIN hash column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pin_hash text;
