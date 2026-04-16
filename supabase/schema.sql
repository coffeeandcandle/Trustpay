-- ============================================================
-- TrustPay Escrow Platform - Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- Extends Supabase auth.users with profile information
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id               UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  full_name        TEXT,
  phone            TEXT,
  company          TEXT,
  city             TEXT,
  emirates_id      TEXT,
  plan             TEXT DEFAULT NULL CHECK (plan IN ('free', 'standard', 'pro')),
  plan_selected_at TIMESTAMPTZ DEFAULT NULL,
  role             TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESCROW TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title              TEXT NOT NULL,
  amount             NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  sender_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_email       TEXT NOT NULL,
  sender_name        TEXT NOT NULL,
  sender_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  receiver_email     TEXT NOT NULL,
  receiver_name      TEXT,
  receiver_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  status             TEXT NOT NULL DEFAULT 'pending_deposit' CHECK (
    status IN (
      'pending_deposit',
      'funded',
      'sender_confirmed',
      'receiver_confirmed',
      'released',
      'disputed',
      'cancelled'
    )
  ),
  notes              TEXT,
  release_date       DATE,
  dispute_reason     TEXT,
  created_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BANK ACCOUNTS TABLE
-- ============================================================
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

-- ============================================================
-- WITHDRAWAL REQUESTS TABLE
-- ============================================================
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

-- Apply updated_at trigger to withdrawal_requests
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

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_sender_email
  ON public.escrow_transactions(sender_email);

CREATE INDEX IF NOT EXISTS idx_transactions_receiver_email
  ON public.escrow_transactions(receiver_email);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.escrow_transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_date
  ON public.escrow_transactions(created_date DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to escrow_transactions
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- Triggered when a new user signs up via Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Note: Backend uses service role key which bypasses RLS.
-- These policies are for direct Supabase client access safety.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Transactions: users can see transactions where they are sender or receiver
CREATE POLICY "transactions_select_own" ON public.escrow_transactions
  FOR SELECT USING (
    sender_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR receiver_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );
