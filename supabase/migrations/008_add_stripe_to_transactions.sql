ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS seller_amount NUMERIC DEFAULT 0;
