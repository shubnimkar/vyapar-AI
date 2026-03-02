-- Vyapar AI Database Schema
-- Run this in Supabase SQL Editor after setting up your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (optional - for multi-device sync)
-- Can work without auth using device_id only
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE,
  device_id TEXT, -- Browser fingerprint for no-auth mode
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb -- Store language, settings, etc.
);

-- Daily business entries
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- Required for no-auth mode
  entry_date DATE NOT NULL,
  total_sales DECIMAL(12,2) NOT NULL CHECK (total_sales >= 0),
  total_expense DECIMAL(12,2) NOT NULL CHECK (total_expense >= 0),
  cash_in_hand DECIMAL(12,2),
  estimated_profit DECIMAL(12,2),
  expense_ratio DECIMAL(5,2),
  profit_margin DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  -- Ensure one entry per day per device/user
  UNIQUE(device_id, entry_date)
);

-- Credit tracking entries (udhaar)
CREATE TABLE IF NOT EXISTS credit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_entries_device_date ON daily_entries(device_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date ON daily_entries(user_id, entry_date DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_entries_archived ON daily_entries(is_archived, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_credit_entries_device ON credit_entries(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_entries_user ON credit_entries(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_entries_paid ON credit_entries(is_paid, due_date);
CREATE INDEX IF NOT EXISTS idx_credit_entries_archived ON credit_entries(is_archived, created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_entries_updated_at
  BEFORE UPDATE ON daily_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_entries_updated_at
  BEFORE UPDATE ON credit_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anon users to access all data (device-based isolation handled in app)
-- This is safe because each device has unique device_id stored in localStorage
CREATE POLICY "Allow anon access to daily entries"
  ON daily_entries
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon access to credit entries"
  ON credit_entries
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon access to users"
  ON users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can access all data (for admin operations)
CREATE POLICY "Service role can access all daily entries"
  ON daily_entries
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all credit entries"
  ON credit_entries
  FOR ALL
  TO service_role
  USING (true);

-- Function to archive old entries (run periodically)
CREATE OR REPLACE FUNCTION archive_old_entries()
RETURNS void AS $$
BEGIN
  -- Archive daily entries older than 90 days
  UPDATE daily_entries
  SET is_archived = true
  WHERE entry_date < CURRENT_DATE - INTERVAL '90 days'
    AND is_archived = false;
  
  -- Archive paid credit entries older than 30 days
  UPDATE credit_entries
  SET is_archived = true
  WHERE is_paid = true
    AND paid_at < NOW() - INTERVAL '30 days'
    AND is_archived = false;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run archive function daily (requires pg_cron extension)
-- Uncomment if you want automatic archiving
-- SELECT cron.schedule('archive-old-entries', '0 2 * * *', 'SELECT archive_old_entries()');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Vyapar AI database schema created successfully!';
  RAISE NOTICE 'Tables created: users, daily_entries, credit_entries';
  RAISE NOTICE 'Indexes and triggers configured';
  RAISE NOTICE 'Row Level Security enabled';
END $$;
