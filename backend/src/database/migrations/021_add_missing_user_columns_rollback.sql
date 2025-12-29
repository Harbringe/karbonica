-- Rollback: 021_add_missing_user_columns

-- Remove locked_until column
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
