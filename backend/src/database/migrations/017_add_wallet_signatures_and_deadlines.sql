-- Migration: 017_add_wallet_signatures_and_deadlines
-- Description: Add wallet signature requirements and voting deadlines
-- Date: 2025-12-09

-- ============================================================================
-- ADD WALLET SIGNATURE TO VALIDATOR VOTES
-- ============================================================================
ALTER TABLE validator_votes
  ADD COLUMN wallet_signature TEXT,
  ADD COLUMN wallet_address VARCHAR(255);

COMMENT ON COLUMN validator_votes.wallet_signature IS 'Cardano wallet signature proving the vote authenticity';
COMMENT ON COLUMN validator_votes.wallet_address IS 'Cardano wallet address used to sign the vote';

-- Index for signature verification
CREATE INDEX idx_validator_votes_wallet_address ON validator_votes(wallet_address);

-- ============================================================================
-- ADD DEADLINE TRACKING TO VERIFICATION REQUESTS
-- ============================================================================
ALTER TABLE verification_requests
  ADD COLUMN voting_deadline TIMESTAMP,
  ADD COLUMN auto_assign_validators BOOLEAN DEFAULT TRUE,
  ADD COLUMN deadline_extended BOOLEAN DEFAULT FALSE,
  ADD COLUMN original_deadline TIMESTAMP;

COMMENT ON COLUMN verification_requests.voting_deadline IS 'Deadline for validators to cast votes (default: 4 days from assignment)';
COMMENT ON COLUMN verification_requests.auto_assign_validators IS 'Whether to automatically assign validators when verification is created';
COMMENT ON COLUMN verification_requests.deadline_extended IS 'Whether the voting deadline has been extended';
COMMENT ON COLUMN verification_requests.original_deadline IS 'Original voting deadline before any extensions';

-- Index for deadline queries
CREATE INDEX idx_verification_requests_voting_deadline ON verification_requests(voting_deadline);
CREATE INDEX idx_verification_requests_deadline_status ON verification_requests(voting_deadline, status);

-- ============================================================================
-- CREATE AUTO-ABSTAIN TRACKING TABLE
-- ============================================================================
CREATE TABLE validator_auto_abstains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  auto_abstained_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  original_deadline TIMESTAMP NOT NULL,
  reason VARCHAR(255) DEFAULT 'Voting deadline expired',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(verification_id, validator_id)
);

CREATE INDEX idx_validator_auto_abstains_verification_id ON validator_auto_abstains(verification_id);
CREATE INDEX idx_validator_auto_abstains_validator_id ON validator_auto_abstains(validator_id);
CREATE INDEX idx_validator_auto_abstains_auto_abstained_at ON validator_auto_abstains(auto_abstained_at);

COMMENT ON TABLE validator_auto_abstains IS 'Tracks validators who were auto-abstained due to deadline expiry';

-- ============================================================================
-- FUNCTION TO AUTO-ABSTAIN EXPIRED VOTES
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_abstain_expired_votes()
RETURNS TABLE (
  verification_id UUID,
  validator_id UUID,
  auto_abstained_count INTEGER
) AS $$
DECLARE
  v_record RECORD;
  v_abstain_count INTEGER := 0;
BEGIN
  -- Find all verifications with expired deadlines that are still in_review
  FOR v_record IN
    SELECT vr.id as verification_id
    FROM verification_requests vr
    WHERE vr.voting_deadline < CURRENT_TIMESTAMP
      AND vr.status = 'in_review'
      AND vr.use_multivalidator = TRUE
  LOOP
    -- For each expired verification, auto-abstain validators who haven't voted
    INSERT INTO validator_votes (verification_id, validator_id, vote, notes, voted_at)
    SELECT
      va.verification_id,
      va.validator_id,
      'abstain',
      'Auto-abstained: Voting deadline expired',
      CURRENT_TIMESTAMP
    FROM validator_assignments va
    LEFT JOIN validator_votes vv
      ON va.verification_id = vv.verification_id
      AND va.validator_id = vv.validator_id
    WHERE va.verification_id = v_record.verification_id
      AND vv.id IS NULL  -- Only validators who haven't voted yet
    ON CONFLICT (verification_id, validator_id) DO NOTHING;

    -- Track the auto-abstains
    INSERT INTO validator_auto_abstains (verification_id, validator_id, original_deadline)
    SELECT
      va.verification_id,
      va.validator_id,
      vr.voting_deadline
    FROM validator_assignments va
    LEFT JOIN validator_votes vv
      ON va.verification_id = vv.verification_id
      AND va.validator_id = vv.validator_id
    INNER JOIN verification_requests vr ON va.verification_id = vr.id
    WHERE va.verification_id = v_record.verification_id
      AND vv.vote = 'abstain'
      AND vv.voted_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'  -- Just auto-abstained
    ON CONFLICT (verification_id, validator_id) DO NOTHING;

    GET DIAGNOSTICS v_abstain_count = ROW_COUNT;

    RETURN QUERY SELECT v_record.verification_id, NULL::UUID, v_abstain_count;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_abstain_expired_votes IS 'Auto-abstains validators who have not voted by the deadline';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_verification_requests_auto_assign ON verification_requests(auto_assign_validators);
