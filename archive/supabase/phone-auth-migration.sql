-- Phone-Based OTP Authentication Migration
-- Run this in Supabase SQL Editor to add phone auth support

-- ============================================
-- 1. Extend users table for phone authentication
-- ============================================

-- Add phone authentication columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'device';

-- Create index for phone lookup (phone_number already exists and is UNIQUE)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) 
WHERE phone_number IS NOT NULL;

-- Add index for auth provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- ============================================
-- 2. Add user_id support to existing tables
-- ============================================

-- user_id column already exists in daily_entries and credit_entries
-- Just ensure it's properly indexed (already done in schema.sql)

-- ============================================
-- 3. Update RLS Policies for Authenticated Users
-- ============================================

-- Drop existing permissive anon policies
DROP POLICY IF EXISTS "Allow anon access to users" ON users;
DROP POLICY IF EXISTS "Allow anon access to daily entries" ON daily_entries;
DROP POLICY IF EXISTS "Allow anon access to credit entries" ON credit_entries;

-- ============================================
-- Users Table Policies
-- ============================================

-- Authenticated users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Authenticated users can insert their own data (for first-time login)
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow device-based access for backward compatibility (temporary)
CREATE POLICY "Allow device access to users"
  ON users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Daily Entries Policies
-- ============================================

-- Authenticated users can access their own entries
-- Also allow access to entries with matching device_id (for migration)
CREATE POLICY "Users can access own daily entries"
  ON daily_entries
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND device_id IN (
      SELECT device_id FROM users WHERE id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Allow device-based access for unauthenticated users (backward compatibility)
CREATE POLICY "Allow device access to daily entries"
  ON daily_entries
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Credit Entries Policies
-- ============================================

-- Authenticated users can access their own credit entries
-- Also allow access to entries with matching device_id (for migration)
CREATE POLICY "Users can access own credit entries"
  ON credit_entries
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND device_id IN (
      SELECT device_id FROM users WHERE id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Allow device-based access for unauthenticated users (backward compatibility)
CREATE POLICY "Allow device access to credit entries"
  ON credit_entries
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Helper Functions for Phone Auth
-- ============================================

-- Function to get or create user by phone number
CREATE OR REPLACE FUNCTION get_or_create_user_by_phone(
  p_phone_number TEXT,
  p_device_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user by phone
  SELECT id INTO v_user_id
  FROM users
  WHERE phone_number = p_phone_number;
  
  -- If not found, create new user
  IF v_user_id IS NULL THEN
    INSERT INTO users (phone_number, device_id, auth_provider, phone_verified)
    VALUES (p_phone_number, p_device_id, 'phone', true)
    RETURNING id INTO v_user_id;
  ELSE
    -- Update last login
    UPDATE users
    SET last_login = NOW(),
        phone_verified = true
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate device data to user account
CREATE OR REPLACE FUNCTION migrate_device_data_to_user(
  p_user_id UUID,
  p_device_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_daily_count INTEGER;
  v_credit_count INTEGER;
  v_result JSONB;
BEGIN
  -- Update daily entries
  UPDATE daily_entries
  SET user_id = p_user_id,
      updated_at = NOW()
  WHERE device_id = p_device_id
    AND user_id IS NULL;
  
  GET DIAGNOSTICS v_daily_count = ROW_COUNT;
  
  -- Update credit entries
  UPDATE credit_entries
  SET user_id = p_user_id,
      updated_at = NOW()
  WHERE device_id = p_device_id
    AND user_id IS NULL;
  
  GET DIAGNOSTICS v_credit_count = ROW_COUNT;
  
  -- Return migration summary
  v_result := jsonb_build_object(
    'success', true,
    'dailyEntriesMigrated', v_daily_count,
    'creditEntriesMigrated', v_credit_count,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Grant Permissions
-- ============================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_or_create_user_by_phone(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION migrate_device_data_to_user(UUID, TEXT) TO authenticated, anon;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phone authentication migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  - Added phone_verified and auth_provider columns to users table';
  RAISE NOTICE '  - Created indexes for phone lookup and auth provider';
  RAISE NOTICE '  - Updated RLS policies for authenticated user access';
  RAISE NOTICE '  - Created helper functions for user management and data migration';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Enable Phone Auth in Supabase Dashboard > Authentication > Providers';
  RAISE NOTICE '  2. Configure SMS provider (Twilio or Supabase built-in)';
  RAISE NOTICE '  3. Set OTP expiry to 600 seconds (10 minutes)';
  RAISE NOTICE '  4. Set rate limit to 3 attempts per hour';
END $$;
