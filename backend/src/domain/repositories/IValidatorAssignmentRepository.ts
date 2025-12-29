import { ValidatorAssignment, CreateValidatorAssignmentData } from '../entities/ValidatorAssignment';

export interface IValidatorAssignmentRepository {
  /**
   * Create a new validator assignment
   */
  save(data: CreateValidatorAssignmentData): Promise<ValidatorAssignment>;

  /**
   * Get all validator assignments for a verification request
   */
  findByVerification(verificationId: string): Promise<ValidatorAssignment[]>;

  /**
   * Get all verifications assigned to a specific validator
   */
  findByValidator(validatorId: string): Promise<ValidatorAssignment[]>;

  /**
   * Check if a validator is assigned to a verification
   */
  isValidatorAssigned(verificationId: string, validatorId: string): Promise<boolean>;

  /**
   * Get a specific assignment by verification and validator
   */
  findByVerificationAndValidator(
    verificationId: string,
    validatorId: string
  ): Promise<ValidatorAssignment | null>;

  /**
   * Remove a validator assignment
   */
  delete(verificationId: string, validatorId: string): Promise<void>;

  /**
   * Remove all validator assignments for a verification
   */
  deleteAllForVerification(verificationId: string): Promise<void>;

  /**
   * Count validators assigned to a verification
   */
  countByVerification(verificationId: string): Promise<number>;
}
