export interface ValidatorAssignment {
  id: string;
  verificationId: string;
  validatorId: string;
  assignedBy: string;
  assignedAt: Date;
  createdAt: Date;
}

export interface CreateValidatorAssignmentData {
  verificationId: string;
  validatorId: string;
  assignedBy: string;
}
