import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CreditService } from '../../application/services/CreditService';
import { CreditEntryRepository } from '../../infrastructure/repositories/CreditEntryRepository';
import { CreditTransactionRepository } from '../../infrastructure/repositories/CreditTransactionRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { database } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import { CreditEntry, CreditStatus } from '../../domain/entities/CreditEntry';
import { User, UserRole } from '../../domain/entities/User';
import { Project, ProjectStatus } from '../../domain/entities/Project';

describe('Credit Retrieval Service', () => {
  let creditService: CreditService;
  let creditEntryRepository: CreditEntryRepository;
  let creditTransactionRepository: CreditTransactionRepository;
  let projectRepository: ProjectRepository;
  let userRepository: UserRepository;

  let testUser: User;
  let testProject: Project;
  let testCredit: CreditEntry;

  beforeEach(async () => {
    // Connect to database
    await database.connect();

    // Initialize repositories
    creditEntryRepository = new CreditEntryRepository();
    creditTransactionRepository = new CreditTransactionRepository();
    projectRepository = new ProjectRepository();
    userRepository = new UserRepository();

    // Initialize service
    creditService = new CreditService(
      creditEntryRepository,
      creditTransactionRepository,
      projectRepository,
      userRepository
    );

    // Create test user
    testUser = {
      id: uuidv4(),
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      name: 'Test User',
      company: 'Test Company',
      role: UserRole.DEVELOPER,
      walletAddress: null,
      emailVerified: true,
      accountLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRepository.save(testUser);

    // Create test project
    testProject = {
      id: uuidv4(),
      developerId: testUser.id,
      title: 'Test Project',
      type: 'forest_conservation',
      description: 'A test project for credit retrieval',
      location: 'Test Location',
      country: 'USA',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      emissionsTarget: 1000.0,
      startDate: new Date('2024-01-01'),
      status: ProjectStatus.VERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await projectRepository.save(testProject);

    // Create test credit
    testCredit = {
      id: uuidv4(),
      creditId: 'KRB-2024-001-000001',
      projectId: testProject.id,
      ownerId: testUser.id,
      quantity: 1000.0,
      vintage: 2024,
      status: CreditStatus.ACTIVE,
      issuedAt: new Date(),
      lastActionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await creditEntryRepository.save(testCredit);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await database.getPool().query('DELETE FROM credit_entries WHERE id = $1', [testCredit.id]);
      await database.getPool().query('DELETE FROM projects WHERE id = $1', [testProject.id]);
      await database.getPool().query('DELETE FROM users WHERE id = $1', [testUser.id]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    await database.disconnect();
  });

  describe('getCreditById', () => {
    it('should retrieve credit by ID', async () => {
      const credit = await creditService.getCreditById(testCredit.id);

      expect(credit).toBeDefined();
      expect(credit?.id).toBe(testCredit.id);
      expect(credit?.creditId).toBe(testCredit.creditId);
      expect(credit?.ownerId).toBe(testUser.id);
      expect(credit?.quantity).toBe(1000.0);
      expect(credit?.status).toBe(CreditStatus.ACTIVE);
    });

    it('should return null for non-existent credit', async () => {
      const nonExistentId = uuidv4();
      const credit = await creditService.getCreditById(nonExistentId);

      expect(credit).toBeNull();
    });
  });

  describe('getCreditsByOwner', () => {
    it('should retrieve credits by owner', async () => {
      const credits = await creditService.getCreditsByOwner(testUser.id);

      expect(credits).toBeDefined();
      expect(credits.length).toBeGreaterThan(0);
      expect(credits[0].ownerId).toBe(testUser.id);
    });

    it('should filter credits by status', async () => {
      const filters = { status: CreditStatus.ACTIVE };
      const credits = await creditService.getCreditsByOwner(testUser.id, filters);

      expect(credits).toBeDefined();
      credits.forEach((credit) => {
        expect(credit.status).toBe(CreditStatus.ACTIVE);
      });
    });

    it('should filter credits by vintage', async () => {
      const filters = { vintage: 2024 };
      const credits = await creditService.getCreditsByOwner(testUser.id, filters);

      expect(credits).toBeDefined();
      credits.forEach((credit) => {
        expect(credit.vintage).toBe(2024);
      });
    });

    it('should support pagination', async () => {
      const pagination = { limit: 1 };
      const credits = await creditService.getCreditsByOwner(testUser.id, {}, pagination);

      expect(credits).toBeDefined();
      expect(credits.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getAllCredits', () => {
    it('should retrieve all credits for administrators', async () => {
      const credits = await creditService.getAllCredits();

      expect(credits).toBeDefined();
      expect(credits.length).toBeGreaterThan(0);
    });

    it('should filter all credits by status', async () => {
      const filters = { status: CreditStatus.ACTIVE };
      const credits = await creditService.getAllCredits(filters);

      expect(credits).toBeDefined();
      credits.forEach((credit) => {
        expect(credit.status).toBe(CreditStatus.ACTIVE);
      });
    });
  });

  describe('countCredits', () => {
    it('should count credits correctly', async () => {
      const count = await creditService.countCredits({ ownerId: testUser.id });

      expect(count).toBeGreaterThan(0);
    });

    it('should count credits with filters', async () => {
      const count = await creditService.countCredits({
        ownerId: testUser.id,
        status: CreditStatus.ACTIVE,
      });

      expect(count).toBeGreaterThan(0);
    });
  });
});
