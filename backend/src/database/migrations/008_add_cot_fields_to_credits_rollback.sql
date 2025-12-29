-- Rollback: Remove COT blockchain fields from credit_entries

-- Drop indexes
DROP INDEX IF EXISTS idx_credit_entries_asset_name;
DROP INDEX IF EXISTS idx_credit_entries_mint_tx_hash;
DROP INDEX IF EXISTS idx_credit_entries_policy_id;

-- Drop columns
ALTER TABLE credit_entries 
DROP COLUMN IF EXISTS token_metadata,
DROP COLUMN IF EXISTS mint_tx_hash,
DROP COLUMN IF EXISTS asset_name,
DROP COLUMN IF EXISTS policy_id;
