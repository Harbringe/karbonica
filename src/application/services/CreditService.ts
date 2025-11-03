import { v4 as uuidv4 } from 'uuid';
import { ICreditEntryRepository } from '../../domain/repositories/ICreditEntryRepository';
import { ICreditTransactionRepository } from '../../domain/repositories/ICreditTransactionRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
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
} from '../../domain/entities/CreditTransaction';
import { Project } from '../../domain/entities/Project';
import { logger } from '../../utils/logger';

export class CreditService {
  constructor(
    private creditEntryRepository: ICreditEntryRepository,
    private creditTransactionRepository: ICreditTransactionRepository,
    private projectRepository: IProjectRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Issue carbon credits for a verified project
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8
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
    if (project.status !== 'verified') {
      throw new Error('Project must be verified before credits can be issued');
    }

    // Check if credits have already been issued for this project
    const existingCredits = await this.creditEntryRepository.findByProject(projectId);
    if (existingCredits.length > 0) {
      throw new Error('Credits have already been issued for this project');
    }

    // Validate project developer exists
    const developer = await this.userRepository.findById(project.developerId);
    if (!developer) {
      throw new Error('Project developer not found');
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

    // Create credit transaction record with type "issuance" (Requirement 5.8)
    const transaction: CreditTransaction = {
      id: uuidv4(),
      creditId: savedCreditEntry.id,
      transactionType: TransactionType.ISSUANCE,
      senderId: undefined, // No sender for issuance
      recipientId: project.developerId, // Developer receives the credits
      quantity: project.emissionsTarget,
      status: TransactionStatus.COMPLETED,
      blockchainTxHash: undefined, // No blockchain transaction for issuance
      metadata: createIssuanceMetadata(projectId, verificationId),
      createdAt: now,
      completedAt: now,
    };

    const savedTransaction = await this.creditTransactionRepository.save(transaction);

    logger.info('Credits issued successfully', {
      projectId,
      verificationId,
      creditId: savedCreditEntry.creditId,
      creditEntryId: savedCreditEntry.id,
      transactionId: savedTransaction.id,
      quantity: savedCreditEntry.quantity,
      vintage: savedCreditEntry.vintage,
      ownerId: savedCreditEntry.ownerId,
      developerName: developer.name,
      developerEmail: developer.email,
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
    filters?: any,
    pagination?: any
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
  async getAllCredits(filters?: any, pagination?: any): Promise<CreditEntry[]> {
    return await this.creditEntryRepository.findAll(filters, pagination);
  }

  /**
   * Count credits with filters
   */
  async countCredits(filters?: any): Promise<number> {
    return await this.creditEntryRepository.count(filters);
  }
}
