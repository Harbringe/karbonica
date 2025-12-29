export enum VoteDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  ABSTAIN = 'abstain',
}

export interface ValidatorVote {
  id: string;
  verificationId: string;
  validatorId: string;
  vote: VoteDecision;
  notes: string | null;
  votedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Cardano blockchain proof
  txHash: string | null; // Transaction hash proving the vote on-chain
  walletAddress: string | null;
  // Legacy fields (optional, for backward compatibility)
  walletSignature: string | null; // Deprecated: use txHash instead
}

export interface CreateValidatorVoteData {
  verificationId: string;
  validatorId: string;
  vote: VoteDecision;
  notes?: string | null;
  walletSignature?: string | null;
  walletAddress?: string | null;
}

export interface UpdateValidatorVoteData {
  vote: VoteDecision;
  notes?: string | null;
  walletSignature?: string | null;
  walletAddress?: string | null;
}

export interface VerificationConsensusStatus {
  verificationId: string;
  totalValidators: number;
  requiredApprovals: number;
  approvalCount: number;
  rejectionCount: number;
  abstainCount: number;
  voteCount: number;
  consensusReached: boolean;
  finalDecision: 'approved' | 'rejected' | 'pending';
  votes: ValidatorVote[];
}
