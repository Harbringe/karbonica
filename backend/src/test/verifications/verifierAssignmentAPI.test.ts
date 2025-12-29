import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { verificationsRouter } from '../../routes/verifications';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { VerificationRequestRepository } from '../../infrastructure/repositories/VerificationRequestRepository';
import { UserRole } from '../../domain/entities/User';
import { VerificationStatus } from '../../domain/entities/VerificationRequest';
import { CryptoUtils } from '../../utils/crypto';
import { authenticate } from '../../middleware/authenticate';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the authenticate middleware for testing
const mockAuthenticate = (user: any) => (req: any, res: any, next: any) => {
  req.user = user;
  next();
};

describe('Verification API - Verifier Assignment', () => {
  let app: express.Application;
  let userRepository: UserRepository;
  let projectRepository: ProjectRepository;
  let verificationRepository: VerificationRequestRepository;

  let adminUser: any;
  let verifierUser: any;
  let developerUser: any;
  let projectId: string;
  let verificationId: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Initialize repositories
    userRepository = new UserRepository();
    projectRepository = new ProjectRepository();
    verificationRepository = new VerificationRequestRepository();

    // Create test users
    const passwordHash = await CryptoUtils.hashPassword('TestPassword123!');

    // Create admin user
    adminUser = {
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
    await userRepository.save(adminUser);

    // Create verifier user
    verifierUser = {
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
    await userRepository.save(verifierUser);

    // Create developer user
    developerUser = {
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
    await userRepository.save(developerUser);

    // Create test project
    const project = {
      id: CryptoUtils.generateId(),
      developerId: developerUser.id,
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
      developerId: developerUser.id,
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
    if (projectId) {
      await projectRepository.delete(projectId);
    }

    if (adminUser?.id) {
      await userRepository.delete(adminUser.id);
    }

    if (verifierUser?.id) {
      await userRepository.delete(verifierUser.id);
    }

    if (developerUser?.id) {
      await userRepository.delete(developerUser.id);
    }
  });

  it('should successfully assign verifier when authenticated as administrator', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({
        verifierId: verifierUser.id,
      })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.verification).toBeDefined();
    expect(response.body.data.verification.id).toBe(verificationId);
    expect(response.body.data.verification.verifierId).toBe(verifierUser.id);
    expect(response.body.data.verification.status).toBe('in_review');
    expect(response.body.data.verification.progress).toBe(30);
    expect(response.body.data.verification.assignedAt).toBeDefined();
    expect(response.body.meta.timestamp).toBeDefined();
    expect(response.body.meta.requestId).toBeDefined();
  });

  it('should return 403 when authenticated as developer', async () => {
    // Setup app with developer authentication
    app.use(mockAuthenticate(developerUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({
        verifierId: verifierUser.id,
      })
      .expect(403);

    expect(response.body.status).toBe('error');
    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body.title).toBe('Access Denied');
    expect(response.body.detail).toContain('Only administrators');
  });

  it('should return 400 when verifierId is missing', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({})
      .expect(400);

    expect(response.body.status).toBe('error');
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.title).toBe('Validation Failed');
    expect(response.body.detail).toBe('verifierId is required');
    expect(response.body.source.pointer).toBe('/data/attributes/verifierId');
  });

  it('should return 404 when verification request does not exist', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const nonExistentId = CryptoUtils.generateId();

    const response = await request(app)
      .post(`/api/v1/verifications/${nonExistentId}/assign`)
      .send({
        verifierId: verifierUser.id,
      })
      .expect(404);

    expect(response.body.status).toBe('error');
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.title).toBe('Not Found');
    expect(response.body.detail).toBe('Verification request not found');
  });

  it('should return 404 when verifier does not exist', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const nonExistentVerifierId = CryptoUtils.generateId();

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({
        verifierId: nonExistentVerifierId,
      })
      .expect(404);

    expect(response.body.status).toBe('error');
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.title).toBe('Not Found');
    expect(response.body.detail).toBe('Verifier not found');
  });

  it('should return 400 when user does not have verifier role', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({
        verifierId: developerUser.id, // Developer instead of verifier
      })
      .expect(400);

    expect(response.body.status).toBe('error');
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.title).toBe('Validation Failed');
    expect(response.body.detail).toContain('must have verifier or administrator role');
  });

  it('should include proper response structure', async () => {
    // Setup app with admin authentication
    app.use(mockAuthenticate(adminUser));
    app.use('/api/v1/verifications', verificationsRouter);
    app.use(errorHandler);

    const response = await request(app)
      .post(`/api/v1/verifications/${verificationId}/assign`)
      .send({
        verifierId: verifierUser.id,
      })
      .expect(200);

    // Verify response structure
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('verification');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('timestamp');
    expect(response.body.meta).toHaveProperty('requestId');

    // Verify verification object structure
    const verification = response.body.data.verification;
    expect(verification).toHaveProperty('id');
    expect(verification).toHaveProperty('projectId');
    expect(verification).toHaveProperty('developerId');
    expect(verification).toHaveProperty('verifierId');
    expect(verification).toHaveProperty('status');
    expect(verification).toHaveProperty('progress');
    expect(verification).toHaveProperty('submittedAt');
    expect(verification).toHaveProperty('assignedAt');
    expect(verification).toHaveProperty('completedAt');
    expect(verification).toHaveProperty('notes');
    expect(verification).toHaveProperty('createdAt');
    expect(verification).toHaveProperty('updatedAt');
  });
});
