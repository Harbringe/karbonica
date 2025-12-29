-- Rollback: Remove Project NFT columns
-- Description: Remove columns for project NFT UTxO reference
-- Date: 2025-11-22

-- Drop index
DROP INDEX IF EXISTS idx_projects_nft_utxo;

-- Drop columns
ALTER TABLE projects 
DROP COLUMN IF EXISTS project_nft_utxo_tx_hash,
DROP COLUMN IF EXISTS project_nft_utxo_output_index,
DROP COLUMN IF EXISTS project_nft_policy_id,
DROP COLUMN IF EXISTS project_nft_asset_name;
