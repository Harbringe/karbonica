-- Migration: 016_add_multivalidator_system
-- Description: Add multivalidator verification system with voting and consensus
-- Date: 2025-12-09

-- ============================================================================
-- VALIDATOR ASSIGNMENTS TABLE
-- ============================================================================
-- Stores the assignment of multiple validators to a verification request
CREATE TABLE validator_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Ensure a validator can only be assigned once to a verification
  UNIQUE(verification_id, validator_id)
);

CREATE INDEX idx_validator_assignments_verification_id ON validator_assignments(verification_id);
CREATE INDEX idx_validator_assignments_validator_id ON validator_assignments(validator_id);
CREATE INDEX idx_validator_assignments_assigned_by ON validator_assignments(assigned_by);

COMMENT ON TABLE validator_assignments IS 'Assigns multiple validators to verification requests';
COMMENT ON COLUMN validator_assignments.verification_id IS 'The verification request being validated';
COMMENT ON COLUMN validator_assignments.validator_id IS 'The validator assigned to review';
COMMENT ON COLUMN validator_assignments.assigned_by IS 'Administrator who made the assignment';

-- ============================================================================
-- VALIDATOR VOTES TABLE
-- ============================================================================
-- Stores individual validator votes/decisions on verification requests
CREATE TABLE validator_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vote VARCHAR(20) NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  notes TEXT,
  voted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Ensure a validator can only vote once per verification (can update their vote)
  UNIQUE(verification_id, validator_id)
);

CREATE INDEX idx_validator_votes_verification_id ON validator_votes(verification_id);
CREATE INDEX idx_validator_votes_validator_id ON validator_votes(validator_id);
CREATE INDEX idx_validator_votes_vote ON validator_votes(vote);
CREATE INDEX idx_validator_votes_voted_at ON validator_votes(voted_at);

COMMENT ON TABLE validator_votes IS 'Individual validator votes on verification requests';
COMMENT ON COLUMN validator_votes.vote IS 'Validator decision: approve, reject, or abstain';
COMMENT ON COLUMN validator_votes.notes IS 'Optional notes explaining the vote decision';

-- ============================================================================
-- UPDATE VERIFICATION_REQUESTS TABLE
-- ============================================================================
-- Add columns to support multivalidator consensus mechanism
ALTER TABLE verification_requests
  ADD COLUMN required_approvals INTEGER DEFAULT 3 CHECK (required_approvals > 0 AND required_approvals <= 10),
  ADD COLUMN approval_count INTEGER DEFAULT 0 CHECK (approval_count >= 0),
  ADD COLUMN rejection_count INTEGER DEFAULT 0 CHECK (rejection_count >= 0),
  ADD COLUMN vote_count INTEGER DEFAULT 0 CHECK (vote_count >= 0),
  ADD COLUMN consensus_reached_at TIMESTAMP,
  ADD COLUMN use_multivalidator BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN verification_requests.required_approvals IS 'Number of approvals needed for consensus (default: 3 out of 5)';
COMMENT ON COLUMN verification_requests.approval_count IS 'Current number of approve votes';
COMMENT ON COLUMN verification_requests.rejection_count IS 'Current number of reject votes';
COMMENT ON COLUMN verification_requests.vote_count IS 'Total number of votes cast (excluding abstentions)';
COMMENT ON COLUMN verification_requests.consensus_reached_at IS 'Timestamp when consensus was reached';
COMMENT ON COLUMN verification_requests.use_multivalidator IS 'Whether to use multivalidator system (false = legacy single verifier)';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_validator_votes_updated_at BEFORE UPDATE ON validator_votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO UPDATE VOTE COUNTS
-- ============================================================================
-- Function to automatically update verification_requests vote counts when votes change
CREATE OR REPLACE FUNCTION update_verification_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_approval_count INTEGER;
  v_rejection_count INTEGER;
  v_vote_count INTEGER;
  v_required_approvals INTEGER;
  v_total_validators INTEGER;
BEGIN
  -- Get the required approvals and total assigned validators
  SELECT required_approvals INTO v_required_approvals
  FROM verification_requests
  WHERE id = COALESCE(NEW.verification_id, OLD.verification_id);

  SELECT COUNT(*) INTO v_total_validators
  FROM validator_assignments
  WHERE verification_id = COALESCE(NEW.verification_id, OLD.verification_id);

  -- Count current votes (excluding abstentions)
  SELECT
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject'),
    COUNT(*) FILTER (WHERE vote IN ('approve', 'reject'))
  INTO v_approval_count, v_rejection_count, v_vote_count
  FROM validator_votes
  WHERE verification_id = COALESCE(NEW.verification_id, OLD.verification_id);

  -- Update the verification_requests table
  UPDATE verification_requests
  SET
    approval_count = v_approval_count,
    rejection_count = v_rejection_count,
    vote_count = v_vote_count,
    -- Mark consensus reached when we have enough approvals
    consensus_reached_at = CASE
      WHEN v_approval_count >= v_required_approvals AND consensus_reached_at IS NULL THEN CURRENT_TIMESTAMP
      ELSE consensus_reached_at
    END,
    -- Auto-approve when consensus is reached
    status = CASE
      WHEN v_approval_count >= v_required_approvals AND status = 'in_review' THEN 'approved'
      -- Auto-reject when it's impossible to reach consensus (more rejections than possible)
      WHEN v_rejection_count > (v_total_validators - v_required_approvals) AND status = 'in_review' THEN 'rejected'
      ELSE status
    END,
    progress = CASE
      WHEN v_approval_count >= v_required_approvals THEN 100
      WHEN v_rejection_count > (v_total_validators - v_required_approvals) THEN 100
      -- Calculate progress based on vote percentage: 30% base + (votes/total * 70%)
      WHEN v_total_validators > 0 THEN 30 + ((v_vote_count::DECIMAL / v_total_validators) * 70)::INTEGER
      ELSE progress
    END,
    completed_at = CASE
      WHEN (v_approval_count >= v_required_approvals OR
            v_rejection_count > (v_total_validators - v_required_approvals))
           AND completed_at IS NULL
      THEN CURRENT_TIMESTAMP
      ELSE completed_at
    END
  WHERE id = COALESCE(NEW.verification_id, OLD.verification_id)
    AND use_multivalidator = TRUE;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update counts when votes are inserted, updated, or deleted
CREATE TRIGGER trigger_update_vote_counts_insert
AFTER INSERT ON validator_votes
FOR EACH ROW
EXECUTE FUNCTION update_verification_vote_counts();

CREATE TRIGGER trigger_update_vote_counts_update
AFTER UPDATE ON validator_votes
FOR EACH ROW
EXECUTE FUNCTION update_verification_vote_counts();

CREATE TRIGGER trigger_update_vote_counts_delete
AFTER DELETE ON validator_votes
FOR EACH ROW
EXECUTE FUNCTION update_verification_vote_counts();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_verification_requests_multivalidator ON verification_requests(use_multivalidator);
CREATE INDEX idx_verification_requests_consensus ON verification_requests(consensus_reached_at);
CREATE INDEX idx_verification_requests_vote_counts ON verification_requests(approval_count, rejection_count);
