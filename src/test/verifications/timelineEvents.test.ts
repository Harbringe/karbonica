import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { VerificationService } from '../../application/services/VerificationService';
import { VerificationRequestRepository } from '../../infrastructure/repositories/VerificationRequestRepository';
import { VerificationEventRepository } from '../../infrastructure/repositories/VerificationEventRepository';
import { VerificationDocumentRepository } from '../../infrastructure/repositories/VerificationDocumentRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { ConsoleEmailService } from '../../infrastructure/services/ConsoleEmailService';
import { UserRole } from '../../domain/entities/User';
import { database } from '../../config/database';

describe('Verification - Timeline Events', () => {
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

  beforeAll(async () => {
    await database.connect();

    userRepository = new UserRepository();
    projectRepository = new ProjectRepository();
    verificationRepository = new VerificationRequestRepository();
    verificationEventRepository = new VerificationEventRepository();
    const verificationDocumentRepository = new VerificationDocumentRepository();
    const emailService = new ConsoleEmailService();

    verificationService = new VerificationService(
      verificationRepository,
      verificationEventRepository,
      verificationDocumentRepository,
      userRepository,
      emailService
    );
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    // Create test users with unique emails for each test
    const timestamp = Date.now();

    const adminUser = await userRepository.save({
      email: `admin-timeline-${timestamp}@example.com`,
      passwordHash: 'hashedpassword',
      name: 'Admin User',
      company: 'Test Company',
      role: UserRole.ADMINISTRATOR,
      emailVerified: true,
    });
    adminUserId = adminUser.id;

    const verifierUser = await userRepository.save({
      email: `verifier-timeline-${timestamp}@example.com`,
      passwordHash: 'hashedpassword',
      name: 'Verifier User',
      company: 'Test Company',
      role: UserRole.VERIFIER,
      emailVerified: true,
    });
    verifierUserId = verifierUser.id;

    const developerUser = await userRepository.save({
      email: `developer-timeline-${timestamp}@example.com`,
      passwordHash: 'hashedpassword',
      name: 'Developer User',
      company: 'Test Company',
      role: UserRole.DEVELOPER,
      emailVerified: true,
    });
    developerUserId = developerUser.id;

    // Create test project
    const project = await projectRepository.save({
      developerId: developerUserId,
      title: 'Test Project',
      type: 'forest_conservation',
      description: 'Test project description',
      location: 'Test Location',
      country: 'US',
      emissionsTarget: 1000,
      startDate: new Date(),
      status: 'pending',
    });
    projectId = project.id;

    // Create verification request
    const verification = await verificationRepository.save({
      projectId: projectId,
      developerId: developerUserId,
      status: 'pending',
      progress: 0,
      submittedAt: new Date(),
    });
    verificationId = verification.id;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      if (verificationId) {
        // Delete verification events first
        const events = await verificationEventRepository.findByVerificationId(verificationId);
        // Note: We'd need a delete method in the repository for proper cleanup
      }

      // Note: In a real test environment, we'd want proper cleanup methods
      // For now, we'll rely on the unique emails to avoid conflicts
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should add timeline event successfully', async () => {
    const eventType = 'test_event';
    const message = 'This is a test timeline event';
    const metadata = { testData: 'test value' };

    const event = await verificationService.addTimelineEvent(
      verificationId,
      eventType,
      message,
      adminUserId,
      UserRole.ADMINISTRATOR,
      metadata
    );

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.verificationId).toBe(verificationId);
    expect(event.eventType).toBe(eventType);
    expect(event.message).toBe(message);
    expect(event.userId).toBe(adminUserId);
    expect(event.metadata).toEqual(metadata);
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('should retrieve timeline events successfully', async () => {
    // Add a test event first
    await verificationService.addTimelineEvent(
      verificationId,
      'test_event_1',
      'First test event',
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    await verificationService.addTimelineEvent(
      verificationId,
      'test_event_2',
      'Second test event',
      verifierUserId,
      UserRole.VERIFIER
    );

    const events = await verificationService.getTimelineEvents(
      verificationId,
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    expect(events).toBeDefined();
    expect(events.length).toBeGreaterThanOrEqual(2);

    // Events should be ordered by creation time (ASC)
    const testEvents = events.filter((e) => e.eventType.startsWith('test_event'));
    expect(testEvents.length).toBe(2);
    expect(testEvents[0].eventType).toBe('test_event_1');
    expect(testEvents[1].eventType).toBe('test_event_2');
  });

  it('should reject timeline event access for unauthorized users', async () => {
    await expect(
      verificationService.addTimelineEvent(
        verificationId,
        'unauthorized_event',
        'This should fail',
        'random-user-id',
        UserRole.DEVELOPER
      )
    ).rejects.toThrow('You do not have permission to add timeline events for this verification');
  });

  it('should reject timeline event retrieval for unauthorized users', async () => {
    await expect(
      verificationService.getTimelineEvents(verificationId, 'random-user-id', UserRole.DEVELOPER)
    ).rejects.toThrow('You do not have permission to view timeline events for this verification');
  });

  it('should allow developer to add timeline events to their own verification', async () => {
    const event = await verificationService.addTimelineEvent(
      verificationId,
      'developer_event',
      'Developer added event',
      developerUserId,
      UserRole.DEVELOPER
    );

    expect(event).toBeDefined();
    expect(event.userId).toBe(developerUserId);
  });

  it('should allow verifier to add timeline events to assigned verification', async () => {
    // First assign the verifier
    await verificationService.assignVerifier(
      verificationId,
      verifierUserId,
      adminUserId,
      UserRole.ADMINISTRATOR
    );

    const event = await verificationService.addTimelineEvent(
      verificationId,
      'verifier_event',
      'Verifier added event',
      verifierUserId,
      UserRole.VERIFIER
    );

    expect(event).toBeDefined();
    expect(event.userId).toBe(verifierUserId);
  });
});
