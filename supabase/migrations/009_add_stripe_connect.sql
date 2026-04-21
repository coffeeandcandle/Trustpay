ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bank_account_id UUID;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
