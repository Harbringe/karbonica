-- Rollback: Remove additional blockchain fields from credit_entries

-- Drop indexes
DROP INDEX IF EXISTS idx_credit_entries_asset_fingerprint;
DROP INDEX IF EXISTS idx_credit_entries_token_unit;
DROP INDEX IF EXISTS idx_credit_entries_burn_tx_hash;
DROP INDEX IF EXISTS idx_credit_entries_mint_block_height;

-- Drop columns
ALTER TABLE credit_entries 
DROP COLUMN IF EXISTS asset_fingerprint,
DROP COLUMN IF EXISTS token_unit,
DROP COLUMN IF EXISTS mint_block_height,
DROP COLUMN IF EXISTS mint_slot,
DROP COLUMN IF EXISTS mint_epoch,
DROP COLUMN IF EXISTS burn_tx_hash,
DROP COLUMN IF EXISTS burn_block_height,
DROP COLUMN IF EXISTS burn_slot,
DROP COLUMN IF EXISTS burn_epoch,
DROP COLUMN IF EXISTS blockchain_explorer_url;
