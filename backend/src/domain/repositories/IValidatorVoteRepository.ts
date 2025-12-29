import {
  ValidatorVote,
  CreateValidatorVoteData,
  UpdateValidatorVoteData,
  VerificationConsensusStatus,
} from '../entities/ValidatorVote';

export interface IValidatorVoteRepository {
  /**
   * Create or update a validator vote
   * Uses UPSERT to handle the unique constraint (verification_id, validator_id)
   */
  save(data: CreateValidatorVoteData): Promise<ValidatorVote>;

  /**
   * Update an existing vote
   */
  update(
    verificationId: string,
    validatorId: string,
    data: UpdateValidatorVoteData
  ): Promise<ValidatorVote>;

  /**
   * Get all votes for a verification request
   */
  findByVerification(verificationId: string): Promise<ValidatorVote[]>;

  /**
   * Get all votes cast by a specific validator
   */
  findByValidator(validatorId: string): Promise<ValidatorVote[]>;

  /**
   * Get a specific vote by verification and validator
   */
  findByVerificationAndValidator(
    verificationId: string,
    validatorId: string
  ): Promise<ValidatorVote | null>;

  /**
   * Delete a vote
   */
  delete(verificationId: string, validatorId: string): Promise<void>;

  /**
   * Get consensus status for a verification
   * Includes vote counts and whether consensus has been reached
   */
  getConsensusStatus(verificationId: string): Promise<VerificationConsensusStatus>;

  /**
   * Count votes by type for a verification
   */
  countVotesByType(verificationId: string): Promise<{
    approve: number;
    reject: number;
    abstain: number;
    total: number;
  }>;
}
