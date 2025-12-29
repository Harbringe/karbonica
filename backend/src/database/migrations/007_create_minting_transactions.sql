-- Migration: 007_create_minting_transactions
-- Description: Create minting_transactions table for tracking Cardano native token minting/burning operations
-- Date: 2025-11-08
-- Related: Cardano native token minting functionality

-- Create enum type for minting operations
CREATE TYPE minting_operation AS ENUM ('MINT', 'BURN');

-- Create minting_transactions table
CREATE TABLE minting_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  policy_id VARCHAR(56) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  quantity BIGINT NOT NULL,
  operation minting_operation NOT NULL,
  tx_hash VARCHAR(64) NOT NULL,
  metadata JSONB,
  policy_script JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_minting_transactions_project_id ON minting_transactions(project_id);
CREATE INDEX idx_minting_transactions_policy_id ON minting_transactions(policy_id);
CREATE INDEX idx_minting_transactions_tx_hash ON minting_transactions(tx_hash);
CREATE INDEX idx_minting_transactions_operation ON minting_transactions(operation);
CREATE INDEX idx_minting_transactions_created_at ON minting_transactions(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_minting_transactions_updated_at BEFORE UPDATE ON minting_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE minting_transactions IS 'Tracks Cardano native token minting and burning operations for carbon credits';
COMMENT ON COLUMN minting_transactions.policy_id IS 'Cardano native token policy ID (56 hex characters)';
COMMENT ON COLUMN minting_transactions.asset_name IS 'Cardano native token asset name';
COMMENT ON COLUMN minting_transactions.quantity IS 'Number of tokens minted or burned';
COMMENT ON COLUMN minting_transactions.operation IS 'Type of operation: MINT or BURN';
COMMENT ON COLUMN minting_transactions.tx_hash IS 'Cardano transaction hash (64 hex characters)';
COMMENT ON COLUMN minting_transactions.metadata IS 'Additional metadata for the minting transaction';
COMMENT ON COLUMN minting_transactions.policy_script IS 'Cardano policy script used for minting/burning';
