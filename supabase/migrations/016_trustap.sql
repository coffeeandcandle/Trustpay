-- Migration 016: Add Trustap integration columns

-- Trustap guest user ID stored per TrustDepo user (created once, reused)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trustap_user_id text;

-- Trustap escrow transaction tracking on our side
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS trustap_transaction_id text,
  ADD COLUMN IF NOT EXISTS trustap_buyer_id       text,
  ADD COLUMN IF NOT EXISTS trustap_seller_id      text;
