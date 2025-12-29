-- Migration: Add Project NFT columns
-- Description: Add columns to store project NFT UTxO reference for COT minting
-- Date: 2025-11-22

-- Add columns for project NFT tracking
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_nft_utxo_tx_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS project_nft_utxo_output_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS project_nft_policy_id VARCHAR(56),
ADD COLUMN IF NOT EXISTS project_nft_asset_name VARCHAR(64);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_nft_utxo 
ON projects(project_nft_utxo_tx_hash, project_nft_utxo_output_index);

-- Add comments
COMMENT ON COLUMN projects.project_nft_utxo_tx_hash IS 'Transaction hash of the project NFT UTxO';
COMMENT ON COLUMN projects.project_nft_utxo_output_index IS 'Output index of the project NFT UTxO';
COMMENT ON COLUMN projects.project_nft_policy_id IS 'Policy ID of the project NFT';
COMMENT ON COLUMN projects.project_nft_asset_name IS 'Asset name of the project NFT';
