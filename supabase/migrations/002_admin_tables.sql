-- Add role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  user_email TEXT,
  amount NUMERIC,
  reason TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  description TEXT,
  resolution_notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  status TEXT DEFAULT 'ready',
  total_transactions INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  target_audience TEXT DEFAULT 'all_users',
  target_email TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  user_name TEXT,
  subject TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  assigned_to TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  content TEXT NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_email TEXT,
  subject TEXT,
  category TEXT DEFAULT 'other',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  description TEXT,
  resolution_notes TEXT,
  linked_transaction_id TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_name TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  severity TEXT DEFAULT 'low',
  details JSONB,
  created_date TIMESTAMPTZ DEFAULT NOW()
);
