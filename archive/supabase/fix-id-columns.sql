-- Fix ID columns to accept TEXT instead of UUID
-- This allows app-generated IDs like "credit_1772022136186_24631jz38"

-- Change credit_entries.id from UUID to TEXT
ALTER TABLE credit_entries 
  ALTER COLUMN id TYPE TEXT;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_entries' 
  AND column_name = 'id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ID column updated successfully!';
  RAISE NOTICE 'credit_entries.id is now TEXT type';
  RAISE NOTICE 'App-generated IDs will now work';
END $$;
