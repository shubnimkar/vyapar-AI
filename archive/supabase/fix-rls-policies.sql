-- Fix RLS Policies for Anon Access
-- Run this in Supabase SQL Editor to fix the 401 Unauthorized error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can access their own daily entries" ON daily_entries;
DROP POLICY IF EXISTS "Users can access their own credit entries" ON credit_entries;
DROP POLICY IF EXISTS "Allow anon access to daily entries" ON daily_entries;
DROP POLICY IF EXISTS "Allow anon access to credit entries" ON credit_entries;
DROP POLICY IF EXISTS "Allow anon access to users" ON users;

-- Create new permissive policies for anon users
-- Device isolation is handled in the application layer via device_id
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

-- Verify policies are created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('daily_entries', 'credit_entries', 'users')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully!';
  RAISE NOTICE 'Anon users can now access all tables';
  RAISE NOTICE 'Device isolation handled in application layer';
END $$;
