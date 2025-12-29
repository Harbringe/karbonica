import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VerificationService } from '../../application/services/VerificationService';
import { VerificationRequestRepository } from '../../infrastructure/repositories/VerificationRequestRepository';
import { VerificationEventRepository } from '../../infrastructure/repositories/VerificationEventRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { ConsoleEmailService } from '../../infrastructure/services/ConsoleEmailService';
import { UserRole } from '../../domain/entities/User';
import { VerificationStatus } from '../../domain/entities/VerificationRequest';
import { CryptoUtils } from '../../utils/crypto';

describe('Verification - Verifier Assignment', () => {
  let verificationService: VerificationService;
  let userRepository: UserRepository;
  let projectRepository: ProjectRepository;
  let verificationRepository: VerificationRequestRepository;
  let verificationEventRepository: VerificationEventRepository;

  let adminUserId: string;
  let verifierUserId: string;
  let developerUserId: string;
  let projectId: string;
  let verificationId: string;

  beforeEach(async () => {
    // Initialize repositories and service
    userRepository = new UserRepository();
    projectRepository = new ProjectRepository();
    verificationRepository = new VerificationRequestRepository();
    verificationEventRepository = new VerificationEventRepository();
    const emailService = new ConsoleEmailService();

    verificationService = new VerificationService(
      verificationRepository,
      verificationEventRepository,
      userRepository,
      emailService
    );

    // Create test users
    const passwordHash = await CryptoUtils.hashPassword('TestPassword123!');

    // Create admin user
    const adminUser = {
      id: CryptoUtils.generateId(),
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      company: null,
      role: UserRole.ADMINISTRATOR,
      walletAddress: null,
      emailVerified: true,
      accountLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const savedAdmin = await userRepository.save(adminUser);
    adminUserId = savedAdmin.id;

    // Create verifier user
    const verifierUser = {
      id: CryptoUtils.generateId(),
      email: 'verifier@example.com',
      passwordHash,
      name: 'Verifier User',
      company: null,
      role: UserRole.VERIFIER,
      walletAddress: null,
      emailVerified: true,
      accountLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const savedVerifier = await userRepository.save(verifierUser);
    verifierUserId = savedVerifier.id;

    // Create developer user
    const developerUser = {
      id: CryptoUtils.generateId(),
      email: 'developer@example.com',
      passwordHash,
      name: 'Developer User',
      company: null,
      role: UserRole.DEVELOPER,
      walletAddress: null,
      emailVerified: true,
      accountLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const savedDeveloper = await userRepository.save(developerUser);
    developerUserId = savedDeveloper.id;

    // Create test project
    const project = {
      id: CryptoUtils.generateId(),
      developerId: developerUserId,
      title: 'Test Carbon Project',
      type: 'forest_conservation' as const,
      description: 'A test forest conservation project for carbon credits',
      location: 'Test Forest, Test Country',
      country: 'USA',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      emissionsTarget: 1000.5,
      startDate: new Date('2024-01-01'),
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const savedProject = await projectRepository.save(project);
    projectId = savedProject.id;

    // Create test verification request
    const verification = {
      id: CryptoUtils.generateId(),
      projectId: projectId,
      developerId: developerUserId,
      verifierId: null,
      status: VerificationStatus.PENDING,
      progress: 0,
      submittedAt: new Date(),
      assignedAt: null,
      completedAt: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const savedVerification = await verificationRepository.save(verification);
    verificationId = savedVerification.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (verificationId) {
      await verificationRepository.findById(verificationId).then(async (verification) => {
        if (verification) {
          // Delete verification events first
          const events = await verificationEventRepository.findByVerificationId(verificationId);
          // Note: We'd need a delete method in the repository for proper cleanup
        }
      });
    }

    if (projectId) {
      await projectRepository.delete(projectId);
    }

    if (adminUserId) {
      await userRepository.delete(adminUserId);
    }

    if (verifierUserId) {
      await userRepository.delete(verifierUserId);
    }

    if (developerUserId) {
      await userRepository.delete(developerUserId);
    }
  });

  it('should successfully assign verifier when user is administrator', async () => {
    const result = await verificationService.assignVerifier(
      verificationId,
      verifierUserId,
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    expect(result).toBeDefined();
    expect(result.id).toBe(verificationId);
    expect(result.verifierId).toBe(verifierUserId);
    expect(result.status).toBe(VerificationStatus.IN_REVIEW);
    expect(result.progress).toBe(30);
    expect(result.assignedAt).toBeDefined();
    expect(result.assignedAt).toBeInstanceOf(Date);
  });

  it('should create timeline event when verifier is assigned', async () => {
    await verificationService.assignVerifier(
      verificationId,
      verifierUserId,
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    const events = await verificationEventRepository.findByVerificationId(verificationId);
    expect(events.length).toBe(1);

    const event = events[0];
    expect(event.eventType).toBe('verifier_assigned');
    expect(event.message).toContain('Verifier Verifier User assigned');
    expect(event.userId).toBe(adminUserId);
    expect(event.metadata).toBeDefined();
    expect(event.metadata?.verifierId).toBe(verifierUserId);
    expect(event.metadata?.verifierName).toBe('Verifier User');
    expect(event.metadata?.verifierEmail).toBe('verifier@example.com');
  });

  it('should reject assignment when user is not administrator', async () => {
    await expect(
      verificationService.assignVerifier(
        verificationId,
        verifierUserId,
        developerUserId,
        UserRole.DEVELOPER
      )
    ).rejects.toThrow('Only administrators can assign verifiers');
  });

  it('should reject assignment when verification request does not exist', async () => {
    const nonExistentVerificationId = CryptoUtils.generateId();

    await expect(
      verificationService.assignVerifier(
        nonExistentVerificationId,
        verifierUserId,
        adminUserId,
        UserRole.ADMINISTRATOR
      )
    ).rejects.toThrow('Verification request not found');
  });

  it('should reject assignment when verifier does not exist', async () => {
    const nonExistentVerifierId = CryptoUtils.generateId();

    await expect(
      verificationService.assignVerifier(
        verificationId,
        nonExistentVerifierId,
        adminUserId,
        UserRole.ADMINISTRATOR
      )
    ).rejects.toThrow('Verifier not found');
  });

  it('should reject assignment when user does not have verifier role', async () => {
    await expect(
      verificationService.assignVerifier(
        verificationId,
        developerUserId, // Developer user instead of verifier
        adminUserId,
        UserRole.ADMINISTRATOR
      )
    ).rejects.toThrow('User must have verifier or administrator role');
  });

  it('should allow assignment of administrator as verifier', async () => {
    const result = await verificationService.assignVerifier(
      verificationId,
      adminUserId, // Admin can also be assigned as verifier
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    expect(result.verifierId).toBe(adminUserId);
    expect(result.status).toBe(VerificationStatus.IN_REVIEW);
    expect(result.progress).toBe(30);
  });

  it('should update verification status and progress correctly', async () => {
    // Verify initial state
    const initialVerification = await verificationRepository.findById(verificationId);
    expect(initialVerification?.status).toBe(VerificationStatus.PENDING);
    expect(initialVerification?.progress).toBe(0);
    expect(initialVerification?.verifierId).toBeNull();
    expect(initialVerification?.assignedAt).toBeNull();

    // Assign verifier
    await verificationService.assignVerifier(
      verificationId,
      verifierUserId,
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    // Verify updated state
    const updatedVerification = await verificationRepository.findById(verificationId);
    expect(updatedVerification?.status).toBe(VerificationStatus.IN_REVIEW);
    expect(updatedVerification?.progress).toBe(30);
    expect(updatedVerification?.verifierId).toBe(verifierUserId);
    expect(updatedVerification?.assignedAt).toBeDefined();
    expect(updatedVerification?.assignedAt).toBeInstanceOf(Date);
  });
});
