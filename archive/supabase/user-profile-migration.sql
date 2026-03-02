-- User Profile & Data Management System Migration
-- This migration extends the users table with profile columns and adds automated data retention functions

-- ============================================
-- 1. Extend Users Table with Profile Columns
-- ============================================

-- Add profile columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shop_name TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Add account status columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Add deletion tracking columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update existing preferences JSONB to include new defaults
UPDATE users
SET preferences = COALESCE(preferences, '{}'::jsonb) || '{
  "data_retention_days": 90,
  "auto_archive": true,
  "notifications_enabled": true,
  "currency": "INR"
}'::jsonb
WHERE preferences IS NULL 
   OR NOT preferences ? 'data_retention_days';

-- Add constraints (drop first if they exist to make migration idempotent)
DO $$ 
BEGIN
  -- Drop constraints if they exist
  ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_language;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_subscription_tier;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_retention_days;
  
  -- Add constraints
  ALTER TABLE users ADD CONSTRAINT valid_language 
    CHECK (language IN ('en', 'hi', 'mr'));
  
  ALTER TABLE users ADD CONSTRAINT valid_subscription_tier 
    CHECK (subscription_tier IN ('free', 'premium'));
  
  ALTER TABLE users ADD CONSTRAINT valid_retention_days 
    CHECK ((preferences->>'data_retention_days')::int BETWEEN 30 AND 365);
END $$;

-- ============================================
-- 2. Add is_archived Column to Existing Tables
-- ============================================

ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE credit_entries
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create indexes for archived data queries
CREATE INDEX IF NOT EXISTS idx_daily_entries_archived 
  ON daily_entries(is_archived, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_credit_entries_archived 
  ON credit_entries(is_archived, created_at DESC);

-- ============================================
-- 3. Create Reports Table
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reports_user_date 
  ON reports(user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_archived 
  ON reports(is_archived, created_at DESC);

-- ============================================
-- 4. Automated Function: archive_old_entries
-- ============================================

CREATE OR REPLACE FUNCTION archive_old_entries()
RETURNS void AS $$
BEGIN
  -- Archive daily entries based on user's retention settings
  UPDATE daily_entries de
  SET is_archived = true
  FROM users u
  WHERE de.user_id = u.id
    AND u.preferences->>'auto_archive' = 'true'
    AND de.entry_date < CURRENT_DATE - ((u.preferences->>'data_retention_days')::int || ' days')::interval
    AND de.is_archived = false;
  
  -- Archive paid credit entries older than 30 days
  UPDATE credit_entries
  SET is_archived = true
  WHERE is_paid = true
    AND paid_at < NOW() - INTERVAL '30 days'
    AND is_archived = false;
  
  -- Archive reports older than 30 days
  UPDATE reports
  SET is_archived = true
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_archived = false;
    
  RAISE NOTICE 'archive_old_entries completed successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Automated Function: cleanup_inactive_users
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  -- Mark users inactive if not logged in for 180 days
  UPDATE users
  SET is_active = false
  WHERE last_active_at < NOW() - INTERVAL '180 days'
    AND is_active = true;
  
  -- Archive data for inactive users
  UPDATE daily_entries de
  SET is_archived = true
  FROM users u
  WHERE de.user_id = u.id
    AND u.is_active = false
    AND de.is_archived = false;
  
  UPDATE credit_entries ce
  SET is_archived = true
  FROM users u
  WHERE ce.user_id = u.id
    AND u.is_active = false
    AND ce.is_archived = false;
  
  UPDATE reports r
  SET is_archived = true
  FROM users u
  WHERE r.user_id = u.id
    AND u.is_active = false
    AND r.is_archived = false;
    
  RAISE NOTICE 'cleanup_inactive_users completed successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Automated Function: process_account_deletions
-- ============================================

CREATE OR REPLACE FUNCTION process_account_deletions()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Find users past their deletion grace period
  FOR user_record IN
    SELECT id, phone_number FROM users
    WHERE deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= NOW()
  LOOP
    -- Delete all user data (CASCADE will handle related records)
    DELETE FROM users WHERE id = user_record.id;
    deleted_count := deleted_count + 1;
    
    RAISE NOTICE 'Deleted user % (phone: %)', user_record.id, user_record.phone_number;
    
    -- Note: S3 file deletion should be handled by application code
    -- triggered by this deletion
  END LOOP;
  
  RAISE NOTICE 'process_account_deletions completed: % users deleted', deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Grant Execute Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION archive_old_entries() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_inactive_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_account_deletions() TO authenticated, service_role;

-- ============================================
-- 8. Enable RLS for Reports Table
-- ============================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anon access to reports (device-based isolation handled in app)
CREATE POLICY "Allow anon access to reports"
  ON reports
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can access all reports
CREATE POLICY "Service role can access all reports"
  ON reports
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ User Profile & Data Management System migration completed successfully!';
  RAISE NOTICE 'Tables updated: users (extended), daily_entries, credit_entries, reports (new)';
  RAISE NOTICE 'Functions created: archive_old_entries(), cleanup_inactive_users(), process_account_deletions()';
  RAISE NOTICE 'Indexes and constraints configured';
END $$;
