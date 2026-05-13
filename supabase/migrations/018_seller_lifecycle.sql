-- ════════════════════════════════════════════════════════════════════════════
-- Migration 018: Seller lifecycle state machine, webhook deduplication,
--                payout history, KYC event log
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Seller lifecycle on users ──────────────────────────────────────────────
-- Replace the simple role TEXT column with a proper lifecycle state machine.
-- States:
--   buyer            — default; all new users start here
--   seller_pending   — user started Trustap OAuth; not yet verified
--   seller_verified  — Trustap OAuth completed; can receive escrow payouts
--   seller_rejected  — KYC/verification rejected by Trustap
--   seller_suspended — manually suspended by admin

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS seller_status TEXT NOT NULL DEFAULT 'buyer'
    CONSTRAINT users_seller_status_check
    CHECK (seller_status IN ('buyer','seller_pending','seller_verified','seller_rejected','seller_suspended'));

-- Backfill: preserve any users already marked as sellers from old role column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE public.users SET seller_status = 'seller_verified' WHERE role = 'seller';
    ALTER TABLE public.users DROP COLUMN role;
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS seller_onboarding_token        TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_onboarding_started_at   TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_onboarding_completed_at TIMESTAMPTZ  DEFAULT NULL;

-- ── 2. Webhook events — deduplication and audit ───────────────────────────────
-- Every inbound webhook is stored here before processing.
-- The UNIQUE(provider, event_id) constraint prevents double-processing.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider         TEXT        NOT NULL,                   -- 'trustap' | 'stripe'
  event_id         TEXT        NOT NULL,                   -- provider-assigned event ID
  event_type       TEXT        NOT NULL,
  payload          JSONB       NOT NULL DEFAULT '{}',
  processed        BOOLEAN     NOT NULL DEFAULT FALSE,
  processing_error TEXT        DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type
  ON public.webhook_events (provider, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON public.webhook_events (processed, created_at)
  WHERE processed = FALSE;

-- Backend service role only; no row-level user access
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_deny_user_access"
  ON public.webhook_events USING (FALSE);

-- ── 3. Payout history ─────────────────────────────────────────────────────────
-- Immutable ledger of every payout event (settled, failed, reversed, etc.)

CREATE TABLE IF NOT EXISTS public.payout_history (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID         NOT NULL REFERENCES public.users(id)                   ON DELETE CASCADE,
  transaction_id     UUID         REFERENCES public.escrow_transactions(id)              ON DELETE SET NULL,
  withdrawal_id      UUID         REFERENCES public.withdrawal_requests(id)              ON DELETE SET NULL,
  amount             NUMERIC(14,2) NOT NULL,
  currency           TEXT         NOT NULL DEFAULT 'GBP',
  provider           TEXT         NOT NULL DEFAULT 'trustap',
  provider_payout_id TEXT         DEFAULT NULL,
  status             TEXT         NOT NULL DEFAULT 'pending'
    CONSTRAINT payout_history_status_check
    CHECK (status IN ('pending','processing','settled','failed','reversed')),
  settled_at         TIMESTAMPTZ  DEFAULT NULL,
  failure_reason     TEXT         DEFAULT NULL,
  metadata           JSONB        DEFAULT '{}',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_history_user
  ON public.payout_history (user_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_status
  ON public.payout_history (status, created_at);

ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_history_select_own"
  ON public.payout_history FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER set_payout_history_updated_at
  BEFORE UPDATE ON public.payout_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 4. KYC events ─────────────────────────────────────────────────────────────
-- Append-only log of KYC state changes per user.

CREATE TABLE IF NOT EXISTS public.kyc_events (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider   TEXT        NOT NULL DEFAULT 'internal', -- 'internal' | 'trustap'
  event_type TEXT        NOT NULL,                    -- 'submitted' | 'approved' | 'rejected' | 'expired'
  status     TEXT        NOT NULL,
  details    JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_events_user
  ON public.kyc_events (user_id, created_at DESC);

ALTER TABLE public.kyc_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_events_select_own"
  ON public.kyc_events FOR SELECT USING (user_id = auth.uid());

-- ── 5. Escrow transactions — payout settlement tracking ───────────────────────
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS payout_settled    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payout_settled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS initiator_role    TEXT        DEFAULT 'buyer'
    CONSTRAINT escrow_initiator_role_check
    CHECK (initiator_role IN ('buyer','seller'));
