-- Migration: 011_create_smart_contract_tables
-- Description: Create tables for smart contract integration (platform tokens, wallet monitoring, certificates, transactions)
-- Date: 2024-11-19

-- ============================================================================
-- PLATFORM TOKENS TABLE
-- ============================================================================
-- Stores platform-wide token policies and statistics
CREATE TABLE platform_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_type VARCHAR(10) NOT NULL CHECK (token_type IN ('COT', 'CET')),
  policy_id VARCHAR(56) NOT NULL,
  asset_name VARCHAR(64) NOT NULL,
  total_minted DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_minted >= 0),
  total_burned DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_burned >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_token_type UNIQUE (token_type),
  CONSTRAINT unique_policy_asset UNIQUE (policy_id, asset_name)
);

-- Indexes for performance
CREATE INDEX idx_platform_tokens_token_type ON platform_tokens(token_type);
CREATE INDEX idx_platform_tokens_policy_id ON platform_tokens(policy_id);

-- Comments for documentation
COMMENT ON TABLE platform_tokens IS 'Platform-wide token policies and minting/burning statistics';
COMMENT ON COLUMN platform_tokens.token_type IS 'Type of token: COT (Carbon Offset Token) or CET (Carbon Emission Token)';
COMMENT ON COLUMN platform_tokens.policy_id IS 'Cardano minting policy ID (script hash)';
COMMENT ON COLUMN platform_tokens.asset_name IS 'Cardano asset name for the token';
COMMENT ON COLUMN platform_tokens.total_minted IS 'Total quantity of tokens minted';
COMMENT ON COLUMN platform_tokens.total_burned IS 'Total quantity of tokens burned';

-- ============================================================================
-- WALLET MONITORING TABLE
-- ============================================================================
-- Tracks user wallets for automatic token burning
CREATE TABLE wallet_monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(128) NOT NULL,
  cot_balance DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (cot_balance >= 0),
  cet_balance DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (cet_balance >= 0),
  auto_burn_enabled BOOLEAN NOT NULL DEFAULT true,
  pending_burn BOOLEAN NOT NULL DEFAULT false,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_user_wallet UNIQUE (user_id, wallet_address)
);

-- Indexes for performance
CREATE INDEX idx_wallet_monitoring_user_id ON wallet_monitoring(user_id);
CREATE INDEX idx_wallet_monitoring_wallet_address ON wallet_monitoring(wallet_address);
CREATE INDEX idx_wallet_monitoring_auto_burn ON wallet_monitoring(auto_burn_enabled);
CREATE INDEX idx_wallet_monitoring_pending_burn ON wallet_monitoring(pending_burn);
CREATE INDEX idx_wallet_monitoring_last_checked ON wallet_monitoring(last_checked);

-- Comments for documentation
COMMENT ON TABLE wallet_monitoring IS 'User wallet monitoring for automatic CET+COT burning';
COMMENT ON COLUMN wallet_monitoring.user_id IS 'Reference to the user who owns this wallet';
COMMENT ON COLUMN wallet_monitoring.wallet_address IS 'Cardano wallet address being monitored';
COMMENT ON COLUMN wallet_monitoring.cot_balance IS 'Current COT token balance in this wallet';
COMMENT ON COLUMN wallet_monitoring.cet_balance IS 'Current CET token balance in this wallet';
COMMENT ON COLUMN wallet_monitoring.auto_burn_enabled IS 'Whether automatic burning is enabled for this wallet';
COMMENT ON COLUMN wallet_monitoring.pending_burn IS 'Whether a burn transaction is currently pending';
COMMENT ON COLUMN wallet_monitoring.last_checked IS 'Last time this wallet was checked by the monitoring service';

-- ============================================================================
-- RETIREMENT CERTIFICATES TABLE
-- ============================================================================
-- Stores NFT certificate records for token burning
CREATE TABLE retirement_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role VARCHAR(10) NOT NULL CHECK (role IN ('buyer', 'seller')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  burn_tx_hash VARCHAR(64) NOT NULL,
  mint_tx_hash VARCHAR(64),
  certificate_nft_policy_id VARCHAR(56),
  asset_name VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_retirement_certificates_certificate_id ON retirement_certificates(certificate_id);
CREATE INDEX idx_retirement_certificates_user_id ON retirement_certificates(user_id);
CREATE INDEX idx_retirement_certificates_burn_tx ON retirement_certificates(burn_tx_hash);
CREATE INDEX idx_retirement_certificates_mint_tx ON retirement_certificates(mint_tx_hash);
CREATE INDEX idx_retirement_certificates_role ON retirement_certificates(role);

-- Comments for documentation
COMMENT ON TABLE retirement_certificates IS 'NFT certificates issued after token burning';
COMMENT ON COLUMN retirement_certificates.certificate_id IS 'Unique certificate identifier';
COMMENT ON COLUMN retirement_certificates.user_id IS 'User who received this certificate';
COMMENT ON COLUMN retirement_certificates.role IS 'Role in the transaction: buyer or seller';
COMMENT ON COLUMN retirement_certificates.amount IS 'Amount of tokens burned for this certificate';
COMMENT ON COLUMN retirement_certificates.burn_tx_hash IS 'Transaction hash of the token burning';
COMMENT ON COLUMN retirement_certificates.mint_tx_hash IS 'Transaction hash of the certificate NFT minting';
COMMENT ON COLUMN retirement_certificates.certificate_nft_policy_id IS 'Policy ID of the certificate NFT';
COMMENT ON COLUMN retirement_certificates.asset_name IS 'Asset name of the certificate NFT';
COMMENT ON COLUMN retirement_certificates.metadata IS 'CIP-25 metadata for the certificate NFT';

-- ============================================================================
-- SMART CONTRACT TRANSACTIONS TABLE
-- ============================================================================
-- Tracks all smart contract transactions
CREATE TABLE smart_contract_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash VARCHAR(64) NOT NULL UNIQUE,
  contract_name VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(15,2),
  block_number BIGINT,
  block_hash VARCHAR(64),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_smart_contract_tx_hash ON smart_contract_transactions(tx_hash);
CREATE INDEX idx_smart_contract_tx_contract_name ON smart_contract_transactions(contract_name);
CREATE INDEX idx_smart_contract_tx_action ON smart_contract_transactions(action);
CREATE INDEX idx_smart_contract_tx_status ON smart_contract_transactions(status);
CREATE INDEX idx_smart_contract_tx_user_id ON smart_contract_transactions(user_id);
CREATE INDEX idx_smart_contract_tx_created_at ON smart_contract_transactions(created_at);

-- Comments for documentation
COMMENT ON TABLE smart_contract_transactions IS 'All smart contract transactions on Cardano blockchain';
COMMENT ON COLUMN smart_contract_transactions.tx_hash IS 'Cardano transaction hash';
COMMENT ON COLUMN smart_contract_transactions.contract_name IS 'Name of the smart contract (e.g., cet_minter.cet_minter.mint)';
COMMENT ON COLUMN smart_contract_transactions.action IS 'Action performed (e.g., mint, burn, transfer)';
COMMENT ON COLUMN smart_contract_transactions.status IS 'Transaction status: pending, confirmed, or failed';
COMMENT ON COLUMN smart_contract_transactions.user_id IS 'User who initiated the transaction';
COMMENT ON COLUMN smart_contract_transactions.amount IS 'Amount of tokens involved in the transaction';
COMMENT ON COLUMN smart_contract_transactions.block_number IS 'Block number where transaction was confirmed';
COMMENT ON COLUMN smart_contract_transactions.block_hash IS 'Block hash where transaction was confirmed';
COMMENT ON COLUMN smart_contract_transactions.error_message IS 'Error message if transaction failed';
COMMENT ON COLUMN smart_contract_transactions.metadata IS 'Additional transaction metadata';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_platform_tokens_updated_at 
    BEFORE UPDATE ON platform_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_monitoring_updated_at 
    BEFORE UPDATE ON wallet_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retirement_certificates_updated_at 
    BEFORE UPDATE ON retirement_certificates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_contract_transactions_updated_at 
    BEFORE UPDATE ON smart_contract_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA: COT AND CET POLICY CONFIGURATIONS
-- ============================================================================
-- Note: These are placeholder values. Actual policy IDs will be derived from
-- the smart contract scripts (script hashes) when the SmartContractService initializes.
-- The policy_id for both COT and CET is the hash of 'cet_minter.cet_minter.mint' script.

INSERT INTO platform_tokens (token_type, policy_id, asset_name, total_minted, total_burned)
VALUES 
  ('COT', 'PLACEHOLDER_POLICY_ID', 'COT', 0, 0),
  ('CET', 'PLACEHOLDER_POLICY_ID', 'CET', 0, 0)
ON CONFLICT (token_type) DO NOTHING;

-- Add comment about placeholder
COMMENT ON TABLE platform_tokens IS 'Platform-wide token policies and minting/burning statistics. Policy IDs are placeholders and will be updated by SmartContractService on initialization.';
