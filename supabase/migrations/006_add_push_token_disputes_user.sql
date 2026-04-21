-- Add expo push token to users for push notifications
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Add passport_number field for non-UAE users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS passport_number TEXT;
