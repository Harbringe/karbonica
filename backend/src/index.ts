import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { apiReference } from '@scalar/express-api-reference';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { database } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { walletRouter } from './routes/wallet';
import { projectsRouter } from './routes/projects';
import { projectDocumentsRouter } from './routes/projectDocuments';
import { verificationsRouter } from './routes/verifications';
import { creditsRouter } from './routes/credits';
import { adminUsersRouter } from './routes/admin/users';
import { marketplaceRouter } from './routes/marketplace';
import uploadsRouter from './routes/uploads';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { startSessionCleanupScheduler, stopSessionCleanupScheduler } from './utils/sessionCleanup';
import { startDeadlineScheduler, stopDeadlineScheduler } from './utils/deadlineScheduler';

class App {
  public app: Application;
  private sessionCleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // SECURITY FIX: Configure CORS to only allow requests from trusted origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing middleware with size limits to prevent DoS
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.use('/health', healthRouter);

    // Swagger API Documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Karbonica API Docs',
      })
    );

    // Swagger JSON endpoint
    this.app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Validated OpenAPI specification for Scalar
    this.app.use('/reference', apiReference({
      spec: {
        content: swaggerSpec,
      },
      theme: 'purple',
    }));

    // API routes
    this.app.use(`/api/${config.apiVersion}/auth`, authRouter);
    this.app.use(`/api/${config.apiVersion}/users/me/wallet`, walletRouter);
    this.app.use(`/api/${config.apiVersion}/projects`, projectsRouter);
    this.app.use(`/api/${config.apiVersion}/projects`, projectDocumentsRouter);
    this.app.use(`/api/${config.apiVersion}/verifications`, verificationsRouter);
    this.app.use(`/api/${config.apiVersion}/credits`, creditsRouter);
    this.app.use(`/api/${config.apiVersion}`, creditsRouter); // For /users/:userId/credits endpoint
    this.app.use(`/api/${config.apiVersion}/admin/users`, adminUsersRouter);
    this.app.use(`/api/${config.apiVersion}/marketplace`, marketplaceRouter);
    this.app.use(`/api/${config.apiVersion}/uploads`, uploadsRouter);

    // Static file serving for uploads
    this.app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await database.connect();
      logger.info('Database connected successfully');

      // Connect to Redis
      await redis.connect();
      logger.info('Redis connected successfully');

      // Start session cleanup scheduler
      this.sessionCleanupInterval = startSessionCleanupScheduler();

      // Start deadline scheduler for auto-abstaining validators
      startDeadlineScheduler();

      // Start server
      this.app.listen(config.port, () => {
        logger.info('Server started', {
          port: config.port,
          environment: config.env,
          apiVersion: config.apiVersion,
        });
      });
    } catch (error) {
      logger.error('Failed to start application', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      // Stop session cleanup scheduler
      if (this.sessionCleanupInterval) {
        stopSessionCleanupScheduler(this.sessionCleanupInterval);
      }

      // Stop deadline scheduler
      stopDeadlineScheduler();

      await database.disconnect();
      await redis.disconnect();
      logger.info('Application stopped gracefully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
}

// Create and start application
const application = new App();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await application.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await application.stop();
  process.exit(0);
});

// Start the application
application.start();

export { application };
