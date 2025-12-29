-- Rollback Migration: 006_update_blockchain_transactions_for_error_handling
-- Description: Rollback changes to blockchain_transactions table
-- Date: 2025-11-08

-- Drop the index on retry_count
DROP INDEX IF EXISTS idx_blockchain_transactions_retry_count;

-- Drop the updated CHECK constraint
ALTER TABLE blockchain_transactions
DROP CONSTRAINT IF EXISTS blockchain_transactions_tx_status_check;

-- Restore original CHECK constraint without 'timeout' status
ALTER TABLE blockchain_transactions
ADD CONSTRAINT blockchain_transactions_tx_status_check
CHECK (tx_status IN ('pending', 'confirmed', 'failed'));

-- Drop error_message column
ALTER TABLE blockchain_transactions
DROP COLUMN IF EXISTS error_message;

-- Drop retry_count column
ALTER TABLE blockchain_transactions
DROP COLUMN IF EXISTS retry_count;
