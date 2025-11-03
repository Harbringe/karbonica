import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CreditService } from '../../application/services/CreditService';
import { CreditEntryRepository } from '../../infrastructure/repositories/CreditEntryRepository';
import { CreditTransactionRepository } from '../../infrastructure/repositories/CreditTransactionRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { CreditStatus } from '../../domain/entities/CreditEntry';
import { TransactionType, TransactionStatus } from '../../domain/entities/CreditTransaction';
import { ProjectStatus } from '../../domain/entities/Project';
import { UserRole } from '../../domain/entities/User';
import { v4 as uuidv4 } from 'uuid';

describe('Credit Issuance', () => {
  let creditService: CreditService;
  let creditEntryRepository: CreditEntryRepository;
  let creditTransactionRepository: CreditTransactionRepository;
  let projectRepository: ProjectRepository;
  let userRepository: UserRepository;

  beforeEach(() => {
    creditEntryRepository = new CreditEntryRepository();
    creditTransactionRepository = new CreditTransactionRepository();
    projectRepository = new ProjectRepository();
    userRepository = new UserRepository();

    creditService = new CreditService(
      creditEntryRepository,
      creditTransactionRepository,
      projectRepository,
      userRepository
    );
  });

  it('should issue credits when project is verified', async () => {
    // This is a unit test to verify the credit issuance logic
    // In a real test, we would mock the repositories

    const mockProject = {
      id: uuidv4(),
      developerId: uuidv4(),
      title: 'Test Forest Conservation Project',
      type: 'forest_conservation',
      description: 'Test project for credit issuance',
      location: 'Test Location',
      country: 'USA',
      emissionsTarget: 1000.0,
      startDate: new Date('2024-01-01'),
      status: ProjectStatus.VERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDeveloper = {
      id: mockProject.developerId,
      email: 'developer@test.com',
      passwordHash: 'hashed',
      name: 'Test Developer',
      company: 'Test Company',
      role: UserRole.DEVELOPER,
      emailVerified: true,
      accountLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock repository methods
    projectRepository.findById = async (id: string) => {
      if (id === mockProject.id) return mockProject;
      return null;
    };

    userRepository.findById = async (id: string) => {
      if (id === mockDeveloper.id) return mockDeveloper;
      return null;
    };

    creditEntryRepository.findByProject = async (projectId: string) => {
      return []; // No existing credits
    };

    creditEntryRepository.getProjectSequence = async (projectId: string) => {
      return 1; // First project
    };

    creditEntryRepository.getNextCreditSequence = async (projectId: string, vintage: number) => {
      return 1; // First credit sequence
    };

    creditEntryRepository.save = async (creditEntry: any) => {
      return creditEntry;
    };

    creditTransactionRepository.save = async (transaction: any) => {
      return transaction;
    };

    // Test credit issuance
    const verificationId = uuidv4();
    const result = await creditService.issueCredits(mockProject.id, verificationId);

    // Verify credit entry
    expect(result.creditEntry).toBeDefined();
    expect(result.creditEntry.projectId).toBe(mockProject.id);
    expect(result.creditEntry.ownerId).toBe(mockProject.developerId);
    expect(result.creditEntry.quantity).toBe(mockProject.emissionsTarget);
    expect(result.creditEntry.status).toBe(CreditStatus.ACTIVE);
    expect(result.creditEntry.vintage).toBe(new Date().getFullYear());
    expect(result.creditEntry.creditId).toMatch(/^KRB-\d{4}-001-000001$/);

    // Verify transaction
    expect(result.transaction).toBeDefined();
    expect(result.transaction.transactionType).toBe(TransactionType.ISSUANCE);
    expect(result.transaction.recipientId).toBe(mockProject.developerId);
    expect(result.transaction.quantity).toBe(mockProject.emissionsTarget);
    expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(result.transaction.metadata).toBeDefined();
    expect(result.transaction.metadata?.projectId).toBe(mockProject.id);
    expect(result.transaction.metadata?.verificationId).toBe(verificationId);
  });

  it('should generate correct serial number format', async () => {
    const { generateCreditSerialNumber } = await import('../../domain/entities/CreditEntry');

    const vintage = 2024;
    const projectSequence = 1;
    const creditSequence = 1;

    const serialNumber = generateCreditSerialNumber(vintage, projectSequence, creditSequence);

    expect(serialNumber).toBe('KRB-2024-001-000001');
  });

  it('should generate different serial numbers for different sequences', async () => {
    const { generateCreditSerialNumber } = await import('../../domain/entities/CreditEntry');

    const vintage = 2024;

    const serial1 = generateCreditSerialNumber(vintage, 1, 1);
    const serial2 = generateCreditSerialNumber(vintage, 1, 2);
    const serial3 = generateCreditSerialNumber(vintage, 2, 1);

    expect(serial1).toBe('KRB-2024-001-000001');
    expect(serial2).toBe('KRB-2024-001-000002');
    expect(serial3).toBe('KRB-2024-002-000001');
  });
});
