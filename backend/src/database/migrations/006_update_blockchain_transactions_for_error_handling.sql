-- Migration: 006_update_blockchain_transactions_for_error_handling
-- Description: Add retry_count and error_message fields to blockchain_transactions table
--              and update status constraint to include 'timeout'
-- Date: 2025-11-08
-- Related Task: Task 30 - Implement Cardano error handling and retry logic

-- Add retry_count column to track retry attempts
ALTER TABLE blockchain_transactions
ADD COLUMN retry_count INTEGER DEFAULT 0 NOT NULL;

-- Add error_message column to store error details
ALTER TABLE blockchain_transactions
ADD COLUMN error_message TEXT;

-- Drop the existing CHECK constraint on tx_status
ALTER TABLE blockchain_transactions
DROP CONSTRAINT IF EXISTS blockchain_transactions_tx_status_check;

-- Add updated CHECK constraint that includes 'timeout' status
ALTER TABLE blockchain_transactions
ADD CONSTRAINT blockchain_transactions_tx_status_check
CHECK (tx_status IN ('pending', 'confirmed', 'failed', 'timeout'));

-- Create index on retry_count for querying failed transactions
CREATE INDEX idx_blockchain_transactions_retry_count ON blockchain_transactions(retry_count);

-- Add comments
COMMENT ON COLUMN blockchain_transactions.retry_count IS 'Number of retry attempts for this transaction';
COMMENT ON COLUMN blockchain_transactions.error_message IS 'Error message if transaction failed';
