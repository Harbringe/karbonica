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
  verifierId: string | null;
  status: VerificationStatus;
  progress: number; // 0-100
  submittedAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVerificationRequestData {
  projectId: string;
  developerId: string;
}
