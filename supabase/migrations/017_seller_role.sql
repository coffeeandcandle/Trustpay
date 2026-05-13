-- Add role and full Trustap seller user ID to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('buyer', 'seller')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trustap_seller_user_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_setup_complete BOOLEAN DEFAULT FALSE;
