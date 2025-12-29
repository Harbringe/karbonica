import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IValidatorAssignmentRepository } from '../../domain/repositories/IValidatorAssignmentRepository';
import { IVerificationEventRepository } from '../../domain/repositories/IVerificationEventRepository';
import { UserRole, User } from '../../domain/entities/User';
import { ValidatorAssignment } from '../../domain/entities/ValidatorAssignment';
import { VerificationEvent } from '../../domain/entities/VerificationEvent';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for automatically assigning validators to verifications
 */
export class AutoValidatorAssignmentService {
  constructor(
    private userRepository: IUserRepository,
    private validatorAssignmentRepository: IValidatorAssignmentRepository,
    private verificationEventRepository: IVerificationEventRepository
  ) {}

  /**
   * Get random validators from the available pool
   * @param count Number of validators to select (default: 5)
   * @param excludeUserIds User IDs to exclude (e.g., the project developer)
   * @returns Array of random validator users
   */
  async getRandomValidators(count: number = 5, excludeUserIds: string[] = []): Promise<User[]> {
    try {
      // Get all users with VERIFIER or ADMINISTRATOR role (high limit to get all)
      const allUsers = await this.userRepository.findAll(1000, 0);

      // Filter to only verifiers and administrators, excluding specified users
      const eligibleValidators = allUsers.filter(
        (user: User) =>
          (user.role === UserRole.VERIFIER || user.role === UserRole.ADMINISTRATOR) &&
          !excludeUserIds.includes(user.id) &&
          user.emailVerified // Only include verified users
      );

      if (eligibleValidators.length === 0) {
        logger.error('No eligible validators found');
        throw new Error('No eligible validators available');
      }

      if (eligibleValidators.length < count) {
        logger.warn('Not enough validators available', {
          requested: count,
          available: eligibleValidators.length,
        });
        // Return all available validators if fewer than requested
        return eligibleValidators;
      }

      // Randomly select 'count' validators using Fisher-Yates shuffle
      const shuffled = [...eligibleValidators];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const selectedValidators = shuffled.slice(0, count);

      logger.info('Random validators selected', {
        count: selectedValidators.length,
        validatorIds: selectedValidators.map((v) => v.id),
      });

      return selectedValidators;
    } catch (error) {
      logger.error('Error getting random validators', { error });
      throw error;
    }
  }

  /**
   * Automatically assign validators to a verification
   * @param verificationId Verification ID
   * @param developerId Developer ID to exclude from validator pool
   * @param requiredApprovals Number of approvals required (default: 3)
   * @param validatorCount Number of validators to assign (default: 5)
   * @returns Array of validator assignments
   */
  async autoAssignValidators(
    verificationId: string,
    developerId: string,
    requiredApprovals: number = 3,
    validatorCount: number = 5
  ): Promise<{
    assignments: ValidatorAssignment[];
    validators: User[];
  }> {
    try {
      logger.info('Starting automatic validator assignment', {
        verificationId,
        validatorCount,
        requiredApprovals,
      });

      // Get random validators (excluding the developer)
      const validators = await this.getRandomValidators(validatorCount, [developerId]);

      if (validators.length < requiredApprovals) {
        throw new Error(
          `Not enough validators available. Required: ${requiredApprovals}, Available: ${validators.length}`
        );
      }

      // Create validator assignments
      const assignments: ValidatorAssignment[] = [];
      for (const validator of validators) {
        const assignment = await this.validatorAssignmentRepository.save({
          verificationId,
          validatorId: validator.id,
          assignedBy: 'system', // System-assigned
        });
        assignments.push(assignment);
      }

      // Create verification event
      const event: VerificationEvent = {
        id: uuidv4(),
        verificationId,
        eventType: 'validators_auto_assigned',
        message: `${validators.length} validators automatically assigned (${requiredApprovals} approvals required)`,
        userId: 'system',
        metadata: {
          validatorIds: validators.map((v) => v.id),
          validatorNames: validators.map((v) => v.name),
          validatorCount: validators.length,
          requiredApprovals,
          autoAssigned: true,
        },
        createdAt: new Date(),
      };

      await this.verificationEventRepository.save(event);

      logger.info('Validators automatically assigned', {
        verificationId,
        assignmentCount: assignments.length,
        validatorIds: validators.map((v) => v.id),
      });

      return { assignments, validators };
    } catch (error) {
      logger.error('Error auto-assigning validators', {
        error,
        verificationId,
      });
      throw error;
    }
  }

  /**
   * Calculate voting deadline (4 days from now)
   * @param from Starting date (default: now)
   * @returns Deadline date
   */
  calculateVotingDeadline(from: Date = new Date()): Date {
    const deadline = new Date(from);
    deadline.setDate(deadline.getDate() + 4); // 4 days
    return deadline;
  }
}
