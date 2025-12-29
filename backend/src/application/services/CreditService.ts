import { v4 as uuidv4 } from 'uuid';
import { ICreditEntryRepository } from '../../domain/repositories/ICreditEntryRepository';
import { ICreditTransactionRepository } from '../../domain/repositories/ICreditTransactionRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ILinkedWalletRepository } from '../../domain/repositories/ILinkedWalletRepository';
import { ProjectStatus } from '../../domain/entities/Project';
import {
  CreditEntry,
  CreditStatus,
  generateCreditSerialNumber,
  validateCreditEntry,
} from '../../domain/entities/CreditEntry';
import {
  CreditTransaction,
  TransactionType,
  TransactionStatus,
  createIssuanceMetadata,
  createTransferMetadata,
} from '../../domain/entities/CreditTransaction';
import { logger } from '../../utils/logger';

// Type definitions for filters and pagination
export interface CreditFilters {
  ownerId?: string;
  projectId?: string;
  status?: string;
  vintage?: number;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CreditService {
  constructor(
    private creditEntryRepository: ICreditEntryRepository,
    private creditTransactionRepository: ICreditTransactionRepository,
    private projectRepository: IProjectRepository,
    private userRepository: IUserRepository,
    private walletRepository?: ILinkedWalletRepository
  ) { }

  /**
   * Issue carbon credits for a verified project
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8
   * 
   * NOTE: COT token minting is handled by the frontend via web3 microservice
   * After calling this endpoint, frontend should call:
   * POST /api/web3/tokens/mint with { creditId, quantity, recipientAddress }
   */
  async issueCredits(
    projectId: string,
    verificationId: string
  ): Promise<{ creditEntry: CreditEntry; transaction: CreditTransaction }> {
    logger.info('Starting credit issuance process', { projectId, verificationId });

    // Get project details (Requirement 5.1)
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Validate project is verified
    if (project.status !== ProjectStatus.VERIFIED) {
      logger.warn('Project not verified, cannot issue credits', {
        projectId,
        projectStatus: project.status,
        expectedStatus: ProjectStatus.VERIFIED,
      });
      throw new Error(
        `Project must be verified before credits can be issued. Current status: ${project.status}`
      );
    }

    // Check if credits have already been issued for this project
    const existingCredits = await this.creditEntryRepository.findByProject(projectId);
    if (existingCredits.length > 0) {
      throw new Error('Credits have already been issued for this project');
    }

    // Validate project has emissions target
    if (!project.emissionsTarget || project.emissionsTarget <= 0) {
      logger.error('Project has invalid emissions target', {
        projectId,
        emissionsTarget: project.emissionsTarget,
      });
      throw new Error(
        `Project has invalid emissions target: ${project.emissionsTarget}. Must be greater than 0.`
      );
    }

    // Validate project developer exists
    const developer = await this.userRepository.findById(project.developerId);
    if (!developer) {
      throw new Error('Project developer not found');
    }

    // Get developer's wallet address (optional - for future COT minting)
    let developerWalletAddress: string | null = null;
    if (this.walletRepository) {
      try {
        const wallet = await this.walletRepository.findByUserId(developer.id);
        if (wallet && wallet.isActive) {
          developerWalletAddress = wallet.address;
          logger.info('Found linked wallet for developer', {
            developerId: developer.id,
            walletAddress: developerWalletAddress,
          });
        }
      } catch (error) {
        logger.warn('Error fetching wallet for developer', {
          developerId: developer.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Generate unique serial number (Requirement 5.2)
    const vintage = new Date().getFullYear(); // Current year (Requirement 5.4)
    const projectSequence = await this.creditEntryRepository.getProjectSequence(projectId);
    const creditSequence = await this.creditEntryRepository.getNextCreditSequence(
      projectId,
      vintage
    );

    const creditId = generateCreditSerialNumber(vintage, projectSequence, creditSequence);

    // Create credit entry (Requirements 5.1, 5.2, 5.3, 5.4, 5.5)
    const now = new Date();
    const creditEntry: CreditEntry = {
      id: uuidv4(),
      creditId, // Unique serial number (KRB-YYYY-XXX-NNNNNN)
      projectId,
      ownerId: project.developerId, // Set owner to project developer (Requirement 5.3)
      quantity: project.emissionsTarget, // Set quantity equal to project emissions target (Requirement 5.1)
      vintage, // Set vintage to current year (Requirement 5.4)
      status: CreditStatus.ACTIVE, // Set status to "active" (Requirement 5.5)
      issuedAt: now,
      lastActionAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Validate credit entry data
    const validationErrors = validateCreditEntry(creditEntry);
    if (validationErrors.length > 0) {
      throw new Error(`Credit entry validation failed: ${validationErrors.join(', ')}`);
    }

    // Save credit entry
    const savedCreditEntry = await this.creditEntryRepository.save(creditEntry);

    // Create credit transaction record with type "issuance"
    const transaction: CreditTransaction = {
      id: uuidv4(),
      creditId: savedCreditEntry.id,
      transactionType: TransactionType.ISSUANCE,
      senderId: undefined, // No sender for issuance
      recipientId: project.developerId, // Developer receives the credits
      quantity: project.emissionsTarget,
      status: TransactionStatus.COMPLETED,
      metadata: {
        ...createIssuanceMetadata(projectId, verificationId),
        developerWalletAddress,
      },
      createdAt: now,
      completedAt: now,
    };

    const savedTransaction = await this.creditTransactionRepository.save(transaction);

    logger.info('Credits issued successfully (COT minting pending via web3 microservice)', {
      projectId,
      verificationId,
      creditId: savedCreditEntry.creditId,
      creditEntryId: savedCreditEntry.id,
      transactionId: savedTransaction.id,
      quantity: savedCreditEntry.quantity,
      vintage: savedCreditEntry.vintage,
      ownerId: savedCreditEntry.ownerId,
      developerName: developer.name,
      developerWalletAddress,
    });

    return {
      creditEntry: savedCreditEntry,
      transaction: savedTransaction,
    };
  }

  /**
   * Get credit entry by ID
   */
  async getCreditById(creditId: string): Promise<CreditEntry | null> {
    return await this.creditEntryRepository.findById(creditId);
  }

  /**
   * Get credit entry by serial number
   */
  async getCreditByCreditId(creditId: string): Promise<CreditEntry | null> {
    return await this.creditEntryRepository.findByCreditId(creditId);
  }

  /**
   * Get credits owned by a user
   */
  async getCreditsByOwner(
    ownerId: string,
    filters?: CreditFilters,
    pagination?: PaginationOptions
  ): Promise<CreditEntry[]> {
    return await this.creditEntryRepository.findByOwner(ownerId, filters, pagination);
  }

  /**
   * Get credits for a project
   */
  async getCreditsByProject(projectId: string): Promise<CreditEntry[]> {
    return await this.creditEntryRepository.findByProject(projectId);
  }

  /**
   * Get transaction history for a credit
   */
  async getTransactionHistory(creditId: string): Promise<CreditTransaction[]> {
    return await this.creditTransactionRepository.findByCreditId(creditId);
  }

  /**
   * Get all credits (for administrators)
   */
  async getAllCredits(
    filters?: CreditFilters,
    pagination?: PaginationOptions
  ): Promise<CreditEntry[]> {
    return await this.creditEntryRepository.findAll(filters, pagination);
  }

  /**
   * Count credits with filters
   */
  async countCredits(filters?: CreditFilters): Promise<number> {
    return await this.creditEntryRepository.count(filters);
  }

  /**
   * Transfer credits to another user
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   *
   * NOTE: COT token transfer is handled by the frontend via web3 microservice
   * After calling this endpoint, if tokens exist, frontend should call:
   * POST /api/web3/tokens/transfer with { policyId, assetName, quantity, recipientAddress }
   */
  async transferCredits(
    creditId: string,
    senderId: string,
    recipientId: string,
    quantity: number
  ): Promise<{ creditEntry: CreditEntry; transaction: CreditTransaction }> {
    logger.info('Starting credit transfer process', {
      creditId,
      senderId,
      recipientId,
      quantity,
    });

    // Validate recipient user exists (Requirement 6.4)
    const recipient = await this.userRepository.findById(recipientId);
    if (!recipient) {
      throw new Error('Recipient user not found');
    }

    // Use serializable transaction isolation (Requirement 6.5)
    const client = await this.creditEntryRepository.getClient();

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Lock credit record FOR UPDATE (Requirement 6.6)
      const credit = await this.creditEntryRepository.lockForUpdateWithClient(client, creditId);

      if (!credit) {
        throw new Error('Credit not found');
      }

      // Validate user owns credits (Requirement 6.1)
      if (credit.ownerId !== senderId) {
        throw new Error('You do not own this credit');
      }

      // Validate credit status is "active" (Requirement 6.3)
      if (credit.status !== CreditStatus.ACTIVE) {
        throw new Error('Credit must be active to transfer');
      }

      // Validate transfer quantity (positive, <= owned) (Requirement 6.2)
      if (quantity <= 0) {
        throw new Error('Transfer quantity must be positive');
      }

      if (quantity > credit.quantity) {
        throw new Error('Transfer quantity exceeds owned amount');
      }

      // Update credit owner to recipient (Requirement 6.7)
      const now = new Date();
      credit.ownerId = recipientId;
      credit.status = CreditStatus.TRANSFERRED;
      credit.lastActionAt = now;
      credit.updatedAt = now;

      const updatedCredit = await this.creditEntryRepository.updateWithClient(client, credit);

      // Create credit transaction record with type "transfer"
      const transaction: CreditTransaction = {
        id: uuidv4(),
        creditId: credit.id,
        transactionType: TransactionType.TRANSFER,
        senderId,
        recipientId,
        quantity,
        status: TransactionStatus.COMPLETED,
        metadata: {
          ...createTransferMetadata(),
          recipientWalletAddress: recipient.walletAddress,
        },
        createdAt: now,
        completedAt: now,
      };

      const savedTransaction = await this.creditTransactionRepository.saveWithClient(
        client,
        transaction
      );

      await client.query('COMMIT');

      logger.info('Credits transferred successfully', {
        creditId: credit.id,
        creditSerialNumber: credit.creditId,
        transactionId: savedTransaction.id,
        senderId,
        recipientId,
        quantity,
      });

      return {
        creditEntry: updatedCredit,
        transaction: savedTransaction,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error transferring credits', {
        error,
        creditId,
        senderId,
        recipientId,
        quantity,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retire credits permanently
   */
  async retireCredits(
    creditId: string,
    userId: string,
    quantity: number,
    reason: string
  ): Promise<{ creditEntry: CreditEntry; transaction: CreditTransaction }> {
    logger.info('Starting credit retirement process', {
      creditId,
      userId,
      quantity,
      reason,
    });

    // Validate retirement reason (Requirement 7.4)
    if (!reason || reason.trim().length === 0) {
      throw new Error('Retirement reason is required');
    }

    // Use serializable transaction isolation (Requirement 7.5)
    const client = await this.creditEntryRepository.getClient();

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Lock credit record FOR UPDATE (Requirement 7.6)
      const credit = await this.creditEntryRepository.lockForUpdateWithClient(client, creditId);

      if (!credit) {
        throw new Error('Credit not found');
      }

      // Validate user owns credits (Requirement 7.1)
      if (credit.ownerId !== userId) {
        throw new Error('You do not own this credit');
      }

      // Validate credit status is "active" (Requirement 7.3)
      if (credit.status !== CreditStatus.ACTIVE) {
        throw new Error('Credit must be active to retire');
      }

      // Validate retirement quantity (positive, <= owned) (Requirement 7.2)
      if (quantity <= 0) {
        throw new Error('Retirement quantity must be positive');
      }

      if (quantity > credit.quantity) {
        throw new Error('Retirement quantity exceeds owned amount');
      }

      // Update credit status to "retired" (Requirement 7.7)
      const now = new Date();
      credit.status = CreditStatus.RETIRED;
      credit.lastActionAt = now;
      credit.updatedAt = now;

      const updatedCredit = await this.creditEntryRepository.updateWithClient(client, credit);

      // Create credit transaction record with type \"retirement\"
      const transaction: CreditTransaction = {
        id: uuidv4(),
        creditId: credit.id,
        transactionType: TransactionType.RETIREMENT,
        senderId: userId,
        recipientId: undefined, // No recipient for retirement
        quantity,
        status: TransactionStatus.COMPLETED,
        metadata: {
          retirementReason: reason,
          retiredAt: now.toISOString(),
        },
        createdAt: now,
        completedAt: now,
      };

      const savedTransaction = await this.creditTransactionRepository.saveWithClient(
        client,
        transaction
      );

      await client.query('COMMIT');

      logger.info('Credits retired successfully', {
        creditId: credit.id,
        creditSerialNumber: credit.creditId,
        transactionId: savedTransaction.id,
        userId,
        quantity,
        reason,
      });

      return {
        creditEntry: updatedCredit,
        transaction: savedTransaction,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error retiring credits', {
        error,
        creditId,
        userId,
        quantity,
        reason,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
