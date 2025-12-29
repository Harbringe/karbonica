import { z } from 'zod';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const castVoteSchema = z.object({
  body: z.object({
    vote: z.enum(['approve', 'reject', 'abstain'], {
      required_error: 'Vote decision is required',
      invalid_type_error: 'Vote must be approve, reject, or abstain',
    }),
    notes: z
      .string()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional()
      .nullable(),
    walletSignature: z.string({
      required_error: 'Wallet signature is required',
    }).min(1, 'Wallet signature cannot be empty'),
    walletAddress: z.string({
      required_error: 'Wallet address is required',
    }).regex(/^addr(_test)?1[a-z0-9]{53,}$/i, 'Invalid Cardano wallet address format'),
  }),
});

export const assignValidatorsSchema = z.object({
  body: z.object({
    validatorIds: z
      .array(z.string().uuid('Each validator ID must be a valid UUID'))
      .min(1, 'At least one validator must be assigned')
      .max(10, 'Cannot assign more than 10 validators'),
    requiredApprovals: z
      .number()
      .int('Required approvals must be an integer')
      .min(1, 'At least 1 approval is required')
      .max(10, 'Required approvals cannot exceed 10')
      .optional(),
  }),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ValidatorVoteData {
  id: string;
  verificationId: string;
  validatorId: string;
  vote: 'approve' | 'reject' | 'abstain';
  notes: string | null;
  votedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatorAssignmentData {
  id: string;
  verificationId: string;
  validatorId: string;
  assignedBy: string;
  assignedAt: string;
  createdAt: string;
}

export interface ConsensusStatusData {
  verificationId: string;
  totalValidators: number;
  requiredApprovals: number;
  approvalCount: number;
  rejectionCount: number;
  abstainCount: number;
  voteCount: number;
  consensusReached: boolean;
  finalDecision: 'approved' | 'rejected' | 'pending';
  progressPercentage: number;
}

export interface ValidatorVoteResponse {
  status: 'success';
  data: {
    vote: ValidatorVoteData;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ValidatorVoteListResponse {
  status: 'success';
  data: {
    votes: ValidatorVoteData[];
    count: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ValidatorAssignmentResponse {
  status: 'success';
  data: {
    assignments: ValidatorAssignmentData[];
    count: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ConsensusStatusResponse {
  status: 'success';
  data: {
    consensus: ConsensusStatusData;
    votes: ValidatorVoteData[];
    assignments: ValidatorAssignmentData[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
