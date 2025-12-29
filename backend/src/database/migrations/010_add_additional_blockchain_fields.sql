-- Migration: Add additional blockchain fields to credit_entries
-- Description: Adds more on-chain details for better traceability and consistency

-- Add additional blockchain fields
ALTER TABLE credit_entries 
ADD COLUMN asset_fingerprint VARCHAR(64),      -- Asset fingerprint (CIP-14)
ADD COLUMN token_unit VARCHAR(120),            -- Full token unit (policyId + assetName)
ADD COLUMN mint_block_height BIGINT,           -- Block height when minted
ADD COLUMN mint_slot BIGINT,                   -- Slot number when minted
ADD COLUMN mint_epoch INTEGER,                 -- Epoch when minted
ADD COLUMN burn_tx_hash VARCHAR(64),           -- Transaction hash when burned (for retired credits)
ADD COLUMN burn_block_height BIGINT,           -- Block height when burned
ADD COLUMN burn_slot BIGINT,                   -- Slot number when burned
ADD COLUMN burn_epoch INTEGER,                 -- Epoch when burned
ADD COLUMN blockchain_explorer_url TEXT;       -- Direct link to blockchain explorer

-- Add indexes for blockchain queries
CREATE INDEX idx_credit_entries_asset_fingerprint ON credit_entries(asset_fingerprint);
CREATE INDEX idx_credit_entries_token_unit ON credit_entries(token_unit);
CREATE INDEX idx_credit_entries_burn_tx_hash ON credit_entries(burn_tx_hash);
CREATE INDEX idx_credit_entries_mint_block_height ON credit_entries(mint_block_height);

-- Add comments for documentation
COMMENT ON COLUMN credit_entries.asset_fingerprint IS 'CIP-14 asset fingerprint for easy identification';
COMMENT ON COLUMN credit_entries.token_unit IS 'Full token unit identifier (policyId + assetName)';
COMMENT ON COLUMN credit_entries.mint_block_height IS 'Cardano block height when token was minted';
COMMENT ON COLUMN credit_entries.mint_slot IS 'Cardano slot number when token was minted';
COMMENT ON COLUMN credit_entries.mint_epoch IS 'Cardano epoch when token was minted';
COMMENT ON COLUMN credit_entries.burn_tx_hash IS 'Transaction hash when token was burned (retirement)';
COMMENT ON COLUMN credit_entries.burn_block_height IS 'Cardano block height when token was burned';
COMMENT ON COLUMN credit_entries.burn_slot IS 'Cardano slot number when token was burned';
COMMENT ON COLUMN credit_entries.burn_epoch IS 'Cardano epoch when token was burned';
COMMENT ON COLUMN credit_entries.blockchain_explorer_url IS 'Direct URL to view token on Cardano explorer';
