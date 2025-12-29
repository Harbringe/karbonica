import { Pool } from 'pg';
import { database } from '../../config/database';
import { IVerificationRequestRepository } from '../../domain/repositories/IVerificationRequestRepository';
import { IValidatorVoteRepository } from '../../domain/repositories/IValidatorVoteRepository';
import { IVerificationEventRepository } from '../../domain/repositories/IVerificationEventRepository';
import { VerificationStatus } from '../../domain/entities/VerificationRequest';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing validator voting deadlines and auto-abstaining
 */
export class ValidatorDeadlineService {
  private pool: Pool;

  constructor(
    private verificationRepository: IVerificationRequestRepository,
    _validatorVoteRepository: IValidatorVoteRepository,
    private verificationEventRepository: IVerificationEventRepository
  ) {
    this.pool = database.getPool();
  }

  /**
   * Auto-abstain validators who haven't voted by the deadline
   * This should be called by a scheduled job (e.g., every hour)
   * @returns Number of validators auto-abstained
   */
  async processExpiredDeadlines(): Promise<{
    verificationsProcessed: number;
    validatorsAutoAbstained: number;
  }> {
    let verificationsProcessed = 0;
    let validatorsAutoAbstained = 0;

    try {
      logger.info('Starting expired deadline processing');

      // Call the PostgreSQL function to auto-abstain expired votes
      const result = await this.pool.query('SELECT * FROM auto_abstain_expired_votes()');

      // Process each verification that had auto-abstains
      for (const row of result.rows) {
        if (row.auto_abstained_count > 0) {
          verificationsProcessed++;
          validatorsAutoAbstained += row.auto_abstained_count;

          // Create verification event
          const verification = await this.verificationRepository.findById(row.verification_id);
          if (verification) {
            const event = {
              id: uuidv4(),
              verificationId: verification.id,
              eventType: 'validators_auto_abstained',
              message: `${row.auto_abstained_count} validator(s) auto-abstained due to deadline expiry`,
              userId: 'system',
              metadata: {
                autoAbstainedCount: row.auto_abstained_count,
                deadline: verification.votingDeadline,
              },
              createdAt: new Date(),
            };

            await this.verificationEventRepository.save(event);

            logger.info('Validators auto-abstained', {
              verificationId: verification.id,
              count: row.auto_abstained_count,
            });
          }
        }
      }

      logger.info('Expired deadline processing completed', {
        verificationsProcessed,
        validatorsAutoAbstained,
      });

      return { verificationsProcessed, validatorsAutoAbstained };
    } catch (error) {
      logger.error('Error processing expired deadlines', { error });
      throw error;
    }
  }

  /**
   * Calculate voting deadline (4 days from now)
   * @param from Date Reference date (defaults to now)
   * @returns Deadline timestamp
   */
  calculateDeadline(from: Date = new Date()): Date {
    const deadline = new Date(from);
    deadline.setDate(deadline.getDate() + 4); // 4 days
    return deadline;
  }

  /**
   * Extend voting deadline for a verification
   * @param verificationId Verification ID
   * @param extensionDays Number of days to extend (default: 2)
   * @param extendedBy User ID who extended the deadline
   * @returns Updated verification
   */
  async extendDeadline(
    verificationId: string,
    extensionDays: number = 2,
    extendedBy: string
  ): Promise<any> {
    try {
      const verification = await this.verificationRepository.findById(verificationId);

      if (!verification) {
        throw new Error('Verification not found');
      }

      if (verification.status !== VerificationStatus.IN_REVIEW) {
        throw new Error('Can only extend deadline for verifications in review');
      }

      if (!verification.votingDeadline) {
        throw new Error('No voting deadline set for this verification');
      }

      // Store original deadline if not already extended
      if (!verification.deadlineExtended) {
        verification.originalDeadline = verification.votingDeadline;
      }

      // Extend the deadline
      const newDeadline = new Date(verification.votingDeadline);
      newDeadline.setDate(newDeadline.getDate() + extensionDays);

      verification.votingDeadline = newDeadline;
      verification.deadlineExtended = true;

      const updatedVerification = await this.verificationRepository.update(verification);

      // Create verification event
      const event = {
        id: uuidv4(),
        verificationId: verification.id,
        eventType: 'deadline_extended',
        message: `Voting deadline extended by ${extensionDays} day(s)`,
        userId: extendedBy,
        metadata: {
          previousDeadline: verification.originalDeadline || verification.votingDeadline,
          newDeadline: newDeadline,
          extensionDays,
        },
        createdAt: new Date(),
      };

      await this.verificationEventRepository.save(event);

      logger.info('Voting deadline extended', {
        verificationId,
        extensionDays,
        newDeadline,
        extendedBy,
      });

      return updatedVerification;
    } catch (error) {
      logger.error('Error extending deadline', { error, verificationId });
      throw error;
    }
  }

  /**
   * Check if voting deadline has expired for a verification
   * @param verificationId Verification ID
   * @returns True if deadline has expired
   */
  async isDeadlineExpired(verificationId: string): Promise<boolean> {
    try {
      const verification = await this.verificationRepository.findById(verificationId);

      if (!verification || !verification.votingDeadline) {
        return false;
      }

      return new Date() > verification.votingDeadline;
    } catch (error) {
      logger.error('Error checking deadline expiration', { error, verificationId });
      return false;
    }
  }

  /**
   * Get time remaining until deadline
   * @param verificationId Verification ID
   * @returns Time remaining in milliseconds (negative if expired)
   */
  async getTimeRemaining(verificationId: string): Promise<number | null> {
    try {
      const verification = await this.verificationRepository.findById(verificationId);

      if (!verification || !verification.votingDeadline) {
        return null;
      }

      return verification.votingDeadline.getTime() - Date.now();
    } catch (error) {
      logger.error('Error getting time remaining', { error, verificationId });
      return null;
    }
  }
}
