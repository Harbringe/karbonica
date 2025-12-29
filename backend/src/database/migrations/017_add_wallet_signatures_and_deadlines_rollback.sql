-- Rollback Migration: 017_add_wallet_signatures_and_deadlines
-- Description: Remove wallet signature requirements and voting deadlines
-- Date: 2025-12-09

-- ============================================================================
-- DROP INDEXES
-- ============================================================================
DROP INDEX IF EXISTS idx_verification_requests_auto_assign;
DROP INDEX IF EXISTS idx_verification_requests_deadline_status;
DROP INDEX IF EXISTS idx_verification_requests_voting_deadline;
DROP INDEX IF EXISTS idx_validator_votes_wallet_address;
DROP INDEX IF EXISTS idx_validator_auto_abstains_auto_abstained_at;
DROP INDEX IF EXISTS idx_validator_auto_abstains_validator_id;
DROP INDEX IF EXISTS idx_validator_auto_abstains_verification_id;

-- ============================================================================
-- DROP FUNCTION
-- ============================================================================
DROP FUNCTION IF EXISTS auto_abstain_expired_votes();

-- ============================================================================
-- DROP TABLE
-- ============================================================================
DROP TABLE IF EXISTS validator_auto_abstains;

-- ============================================================================
-- REVERT VERIFICATION_REQUESTS COLUMNS
-- ============================================================================
ALTER TABLE verification_requests
  DROP COLUMN IF EXISTS original_deadline,
  DROP COLUMN IF EXISTS deadline_extended,
  DROP COLUMN IF EXISTS auto_assign_validators,
  DROP COLUMN IF EXISTS voting_deadline;

-- ============================================================================
-- REVERT VALIDATOR_VOTES COLUMNS
-- ============================================================================
ALTER TABLE validator_votes
  DROP COLUMN IF EXISTS wallet_address,
  DROP COLUMN IF EXISTS wallet_signature;
