-- Rollback Script for User Profile & Data Management System Migration
-- WARNING: This will remove all profile data and automated functions

-- ============================================
-- 1. Drop Automated Functions
-- ============================================

DROP FUNCTION IF EXISTS archive_old_entries();
DROP FUNCTION IF EXISTS cleanup_inactive_users();
DROP FUNCTION IF EXISTS process_account_deletions();

-- ============================================
-- 2. Drop Reports Table
-- ============================================

DROP TABLE IF EXISTS reports CASCADE;

-- ============================================
-- 3. Remove is_archived Columns
-- ============================================

ALTER TABLE daily_entries DROP COLUMN IF EXISTS is_archived;
ALTER TABLE credit_entries DROP COLUMN IF EXISTS is_archived;

-- Drop indexes
DROP INDEX IF EXISTS idx_daily_entries_archived;
DROP INDEX IF EXISTS idx_credit_entries_archived;

-- ============================================
-- 4. Remove Profile Columns from Users Table
-- ============================================

ALTER TABLE users DROP COLUMN IF EXISTS shop_name;
ALTER TABLE users DROP COLUMN IF EXISTS user_name;
ALTER TABLE users DROP COLUMN IF EXISTS language;
ALTER TABLE users DROP COLUMN IF EXISTS business_type;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS last_active_at;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE users DROP COLUMN IF EXISTS deletion_requested_at;
ALTER TABLE users DROP COLUMN IF EXISTS deletion_scheduled_at;

-- Remove constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_language;
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_subscription_tier;
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_retention_days;

-- ============================================
-- 5. Revert Preferences JSONB
-- ============================================

-- Remove profile-related keys from preferences
UPDATE users
SET preferences = preferences - 'data_retention_days' - 'auto_archive' - 'notifications_enabled' - 'currency'
WHERE preferences IS NOT NULL;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ User Profile & Data Management System migration rolled back successfully!';
  RAISE NOTICE 'All profile columns, functions, and tables have been removed';
END $$;
