-- Rollback Migration 018: Remove NFT State Machine

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_nft_policy_config_updated_at ON nft_policy_config;
DROP FUNCTION IF EXISTS update_nft_policy_config_updated_at();

-- Drop tables
DROP TABLE IF EXISTS nft_policy_config;
DROP TABLE IF EXISTS project_nft_state_transitions;

-- Drop indexes on projects
DROP INDEX IF EXISTS idx_projects_nft_state;
DROP INDEX IF EXISTS idx_projects_reference_nft;

-- Remove columns from projects
ALTER TABLE projects
  DROP COLUMN IF EXISTS reference_nft_policy_id,
  DROP COLUMN IF EXISTS reference_nft_asset_name,
  DROP COLUMN IF EXISTS reference_nft_utxo_ref,
  DROP COLUMN IF EXISTS nft_state,
  DROP COLUMN IF EXISTS nft_metadata,
  DROP COLUMN IF EXISTS nft_image_uri,
  DROP COLUMN IF EXISTS nft_minted_at,
  DROP COLUMN IF EXISTS nft_updated_at;
