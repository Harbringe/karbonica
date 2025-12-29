-- Migration: 021_add_missing_user_columns
-- Description: Add locked_until column to users table for account lockout functionality
-- Date: 2024-12-27

-- Add locked_until column only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked after failed login attempts';
