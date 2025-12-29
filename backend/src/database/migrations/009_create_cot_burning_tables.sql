-- Migration: 009_create_cot_burning_tables
-- Description: Create tables for COT burning on credit retirement
-- Date: 2024-11-11

-- ============================================================================
-- ADD COT QUANTITY TO CREDIT ENTRIES
-- ============================================================================
-- Add cot_quantity column to track the amount of COT tokens associated with credits
ALTER TABLE credit_entries 
ADD COLUMN cot_quantity DECIMAL(15,2);

-- Add index for COT quantity queries
CREATE INDEX idx_credit_entries_cot_quantity ON credit_entries(cot_quantity);

-- Add comment for documentation
COMMENT ON COLUMN credit_entries.cot_quantity IS 'Quantity of COT tokens associated with this credit entry';

-- ============================================================================
-- COT BURNING CHALLENGES TABLE
-- ============================================================================
-- Stores challenge-response authentication for COT burning
CREATE TABLE cot_burning_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id VARCHAR(255) UNIQUE NOT NULL,
  credit_id UUID NOT NULL REFERENCES credit_entries(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
  cot_policy_id VARCHAR(56) NOT NULL,
  cot_asset_name VARCHAR(64) NOT NULL,
  challenge_message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  expires_at TIMESTAMP NOT NULL,
  signature TEXT,
  wallet_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_cot_challenges_challenge_id ON cot_burning_challenges(challenge_id);
CREATE INDEX idx_cot_challenges_credit_id ON cot_burning_challenges(credit_id);
CREATE INDEX idx_cot_challenges_user_id ON cot_burning_challenges(user_id);
CREATE INDEX idx_cot_challenges_status ON cot_burning_challenges(status);
CREATE INDEX idx_cot_challenges_expires_at ON cot_burning_challenges(expires_at);

-- Comments for documentation
COMMENT ON TABLE cot_burning_challenges IS 'Challenge-response authentication records for COT token burning';
COMMENT ON COLUMN cot_burning_challenges.challenge_id IS 'Unique identifier for the challenge';
COMMENT ON COLUMN cot_burning_challenges.challenge_message IS 'Message that must be signed by the user wallet';
COMMENT ON COLUMN cot_burning_challenges.status IS 'Current status: pending, verified, expired, or failed';
COMMENT ON COLUMN cot_burning_challenges.expires_at IS 'Challenge expiration timestamp (10 minutes from creation)';

-- ============================================================================
-- COT BURN TRANSACTIONS TABLE
-- ============================================================================
-- Tracks COT token burning transactions on Cardano blockchain
CREATE TABLE cot_burn_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID UNIQUE NOT NULL REFERENCES cot_burning_challenges(id) ON DELETE RESTRICT,
  credit_transaction_id UUID REFERENCES credit_transactions(id) ON DELETE SET NULL,
  tx_hash VARCHAR(64) UNIQUE NOT NULL,
  tx_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (tx_status IN ('pending', 'confirmed', 'failed', 'timeout')),
  burned_quantity DECIMAL(15,2) NOT NULL CHECK (burned_quantity > 0),
  confirmations INTEGER DEFAULT 0,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_cot_burn_tx_hash ON cot_burn_transactions(tx_hash);
CREATE INDEX idx_cot_burn_challenge_id ON cot_burn_transactions(challenge_id);
CREATE INDEX idx_cot_burn_credit_transaction_id ON cot_burn_transactions(credit_transaction_id);
CREATE INDEX idx_cot_burn_status ON cot_burn_transactions(tx_status);
CREATE INDEX idx_cot_burn_submitted_at ON cot_burn_transactions(submitted_at);

-- Comments for documentation
COMMENT ON TABLE cot_burn_transactions IS 'Records of COT token burning transactions on Cardano';
COMMENT ON COLUMN cot_burn_transactions.tx_hash IS 'Cardano transaction hash for the burn transaction';
COMMENT ON COLUMN cot_burn_transactions.tx_status IS 'Transaction status: pending, confirmed, failed, or timeout';
COMMENT ON COLUMN cot_burn_transactions.burned_quantity IS 'Quantity of COT tokens burned in this transaction';
COMMENT ON COLUMN cot_burn_transactions.confirmations IS 'Number of block confirmations (target: 6)';

