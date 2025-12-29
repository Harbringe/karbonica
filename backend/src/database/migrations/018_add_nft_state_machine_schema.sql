-- Migration 018: NFT State Machine (CIP-68 Implementation)
-- Implements finite-state machine NFTs for project verification
--
-- Design: One NFT per project with evolving state
-- States: in_review → approved | rejected (terminal)
-- NO burning on rejection - explicit rejected state for audit trail

-- Add CIP-68 reference NFT fields to projects
ALTER TABLE projects
  ADD COLUMN reference_nft_policy_id VARCHAR(56),   -- Policy ID for reference NFT
  ADD COLUMN reference_nft_asset_name VARCHAR(64),  -- Reference NFT asset name (100 prefix)
  ADD COLUMN reference_nft_utxo_ref TEXT,           -- Current UTxO reference of reference NFT
  ADD COLUMN nft_state VARCHAR(20) DEFAULT 'in_review',  -- Current NFT state
  ADD COLUMN nft_metadata JSONB,                    -- CIP-68 metadata
  ADD COLUMN nft_image_uri TEXT,                    -- IPFS/Arweave image URI
  ADD COLUMN nft_minted_at TIMESTAMP,               -- When NFT was minted
  ADD COLUMN nft_updated_at TIMESTAMP;              -- When state was last updated

-- Add check constraint for valid NFT states
ALTER TABLE projects
  ADD CONSTRAINT check_nft_state
  CHECK (nft_state IN ('in_review', 'approved', 'rejected'));

-- Create index on NFT state for filtering
CREATE INDEX idx_projects_nft_state ON projects(nft_state);
CREATE INDEX idx_projects_reference_nft ON projects(reference_nft_policy_id, reference_nft_asset_name);

-- Create table to track NFT state transitions (audit trail)
CREATE TABLE project_nft_state_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- State transition
  from_state VARCHAR(20) NOT NULL,
  to_state VARCHAR(20) NOT NULL,

  -- Transaction proof
  tx_hash VARCHAR(64) NOT NULL,           -- Transaction hash that made the transition
  block_height INT,                       -- Block where transition was confirmed
  block_time TIMESTAMP,                   -- When block was mined

  -- Who made the transition
  transitioned_by UUID REFERENCES users(id),  -- Validator/admin who triggered
  multisig_validators JSONB,                  -- Array of validators who signed

  -- Additional context
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure states are valid
  CONSTRAINT check_from_state CHECK (from_state IN ('in_review', 'approved', 'rejected')),
  CONSTRAINT check_to_state CHECK (to_state IN ('in_review', 'approved', 'rejected')),

  -- Ensure valid transitions (in_review → approved/rejected only)
  CONSTRAINT check_valid_transition CHECK (
    (from_state = 'in_review' AND to_state IN ('approved', 'rejected'))
    OR (from_state = to_state)  -- Allow same-state updates for metadata changes
  )
);

-- Create indexes
CREATE INDEX idx_nft_transitions_project_id ON project_nft_state_transitions(project_id);
CREATE INDEX idx_nft_transitions_tx_hash ON project_nft_state_transitions(tx_hash);
CREATE INDEX idx_nft_transitions_created_at ON project_nft_state_transitions(created_at DESC);

-- Create table for NFT minting policy configuration
CREATE TABLE nft_policy_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Policy details
  policy_id VARCHAR(56) NOT NULL UNIQUE,
  policy_name VARCHAR(100) NOT NULL,
  policy_script TEXT NOT NULL,            -- Plutus script (hex)
  policy_script_hash VARCHAR(56) NOT NULL,

  -- CIP-68 configuration
  user_token_prefix VARCHAR(10) DEFAULT '',      -- Usually empty or '000de140'
  reference_token_prefix VARCHAR(10) DEFAULT '100',  -- CIP-68 standard

  -- Metadata URIs
  metadata_uri_template TEXT,            -- Template for metadata URI
  image_base_uri TEXT,                   -- Base URI for images (IPFS/Arweave)

  -- State-specific images
  in_review_image_uri TEXT,
  approved_image_uri TEXT,
  rejected_image_uri TEXT,

  -- Policy status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_nft_policy_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nft_policy_config_updated_at
  BEFORE UPDATE ON nft_policy_config
  FOR EACH ROW
  EXECUTE FUNCTION update_nft_policy_config_updated_at();

-- Insert default policy configuration (placeholder - update with real policy after deployment)
INSERT INTO nft_policy_config (
  policy_id,
  policy_name,
  policy_script,
  policy_script_hash,
  metadata_uri_template,
  image_base_uri,
  in_review_image_uri,
  approved_image_uri,
  rejected_image_uri
) VALUES (
  '000000000000000000000000000000000000000000000000000000',  -- Placeholder
  'Karbonica Project Verification NFT',
  '',  -- Will be set after Plutus script compilation
  '',  -- Will be set after Plutus script compilation
  'https://metadata.karbonica.io/projects/{{project_id}}',
  'ipfs://QmKarbonica/',
  'ipfs://QmKarbonica/in_review.png',
  'ipfs://QmKarbonica/approved.png',
  'ipfs://QmKarbonica/rejected.png'
);

-- Comments
COMMENT ON TABLE project_nft_state_transitions IS 'Audit trail of all NFT state transitions with on-chain proof';
COMMENT ON TABLE nft_policy_config IS 'Configuration for NFT minting policy and CIP-68 metadata';
COMMENT ON COLUMN projects.nft_state IS 'Current state: in_review → approved | rejected (terminal states)';
COMMENT ON COLUMN projects.reference_nft_utxo_ref IS 'UTxO reference where reference NFT is locked (format: txHash#outputIndex)';
COMMENT ON COLUMN projects.nft_metadata IS 'CIP-68 compliant metadata object';
COMMENT ON COLUMN project_nft_state_transitions.multisig_validators IS 'Array of validator addresses/IDs who signed the state transition';
COMMENT ON CONSTRAINT check_valid_transition ON project_nft_state_transitions IS 'Enforces state machine: only in_review → approved/rejected allowed';
