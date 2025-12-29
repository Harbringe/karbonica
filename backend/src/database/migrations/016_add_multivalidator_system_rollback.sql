-- Rollback Migration: 016_add_multivalidator_system
-- Description: Remove multivalidator verification system
-- Date: 2025-12-09

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_vote_counts_delete ON validator_votes;
DROP TRIGGER IF EXISTS trigger_update_vote_counts_update ON validator_votes;
DROP TRIGGER IF EXISTS trigger_update_vote_counts_insert ON validator_votes;
DROP TRIGGER IF EXISTS update_validator_votes_updated_at ON validator_votes;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS update_verification_vote_counts();

-- ============================================================================
-- DROP INDEXES
-- ============================================================================
DROP INDEX IF EXISTS idx_verification_requests_vote_counts;
DROP INDEX IF EXISTS idx_verification_requests_consensus;
DROP INDEX IF EXISTS idx_verification_requests_multivalidator;
DROP INDEX IF EXISTS idx_validator_votes_voted_at;
DROP INDEX IF EXISTS idx_validator_votes_vote;
DROP INDEX IF EXISTS idx_validator_votes_validator_id;
DROP INDEX IF EXISTS idx_validator_votes_verification_id;
DROP INDEX IF EXISTS idx_validator_assignments_assigned_by;
DROP INDEX IF EXISTS idx_validator_assignments_validator_id;
DROP INDEX IF EXISTS idx_validator_assignments_verification_id;

-- ============================================================================
-- REVERT VERIFICATION_REQUESTS TABLE
-- ============================================================================
ALTER TABLE verification_requests
  DROP COLUMN IF EXISTS use_multivalidator,
  DROP COLUMN IF EXISTS consensus_reached_at,
  DROP COLUMN IF EXISTS vote_count,
  DROP COLUMN IF EXISTS rejection_count,
  DROP COLUMN IF EXISTS approval_count,
  DROP COLUMN IF EXISTS required_approvals;

-- ============================================================================
-- DROP TABLES
-- ============================================================================
DROP TABLE IF EXISTS validator_votes;
DROP TABLE IF EXISTS validator_assignments;
