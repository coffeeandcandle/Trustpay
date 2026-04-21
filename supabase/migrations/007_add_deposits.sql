CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'AED',
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT DEFAULT 'completed',
  created_date TIMESTAMPTZ DEFAULT NOW()
);
