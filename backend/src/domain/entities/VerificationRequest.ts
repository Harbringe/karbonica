export enum VerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface VerificationRequest {
  id: string;
  projectId: string;
  developerId: string;
  verifierId: string | null; // Deprecated: for legacy single-verifier mode
  status: VerificationStatus;
  progress: number; // 0-100
  submittedAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Multivalidator fields
  requiredApprovals: number; // Number of approvals needed (default: 3 out of 5)
  approvalCount: number; // Current number of approve votes
  rejectionCount: number; // Current number of reject votes
  voteCount: number; // Total votes cast (excluding abstentions)
  consensusReachedAt: Date | null; // When consensus was reached
  useMultivalidator: boolean; // Whether to use multivalidator system
  votingDeadline: Date | null; // Deadline for validators to cast votes (4 days from assignment)
  autoAssignValidators: boolean; // Whether to automatically assign validators
  deadlineExtended: boolean; // Whether the deadline has been extended
  originalDeadline: Date | null; // Original deadline before extensions
}

export interface CreateVerificationRequestData {
  projectId: string;
  developerId: string;
}
