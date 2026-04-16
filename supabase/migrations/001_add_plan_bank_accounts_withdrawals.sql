-- Migration: add plan fields to users, add bank_accounts and withdrawal_requests tables
-- Run this in the Supabase SQL editor if you already applied the original schema.sql

-- 1. Add plan columns to existing users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT NULL CHECK (plan IN ('free', 'standard', 'pro')),
  ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Bank accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_name    TEXT NOT NULL,
  iban         TEXT NOT NULL,
  account_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id
  ON public.bank_accounts(user_id);

-- 3. Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount          NUMERIC(14, 2) NOT NULL CHECK (amount >= 100),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id
  ON public.withdrawal_requests(user_id);

-- updated_at trigger for withdrawal_requests (handle_updated_at function already exists)
CREATE TRIGGER set_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS for bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select_own" ON public.bank_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "bank_accounts_insert_own" ON public.bank_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "bank_accounts_delete_own" ON public.bank_accounts
  FOR DELETE USING (user_id = auth.uid());

-- RLS for withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_requests_select_own" ON public.withdrawal_requests
  FOR SELECT USING (user_id = auth.uid());
