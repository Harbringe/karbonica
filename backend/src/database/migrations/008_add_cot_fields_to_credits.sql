-- Migration: Add COT (Carbon Offset Token) blockchain fields to credit_entries
-- Description: Adds Cardano native token fields to support on-chain COT minting

-- Add blockchain fields for COT tokens
ALTER TABLE credit_entries 
ADD COLUMN policy_id VARCHAR(56),
ADD COLUMN asset_name VARCHAR(64),
ADD COLUMN mint_tx_hash VARCHAR(64),
ADD COLUMN token_metadata JSONB;

-- Add indexes for blockchain queries
CREATE INDEX idx_credit_entries_policy_id ON credit_entries(policy_id);
CREATE INDEX idx_credit_entries_mint_tx_hash ON credit_entries(mint_tx_hash);
CREATE INDEX idx_credit_entries_asset_name ON credit_entries(asset_name);

-- Add comments for documentation
COMMENT ON COLUMN credit_entries.policy_id IS 'Cardano minting policy ID for the COT token';
COMMENT ON COLUMN credit_entries.asset_name IS 'Hex-encoded asset name of the COT token';
COMMENT ON COLUMN credit_entries.mint_tx_hash IS 'Transaction hash of the COT minting transaction';
COMMENT ON COLUMN credit_entries.token_metadata IS 'CIP-25 compliant metadata stored on-chain';
