import { Router, Request, Response, NextFunction } from 'express';
import { CreditService } from '../application/services/CreditService';
import { CreditEntryRepository } from '../infrastructure/repositories/CreditEntryRepository';
import { CreditTransactionRepository } from '../infrastructure/repositories/CreditTransactionRepository';
import { ProjectRepository } from '../infrastructure/repositories/ProjectRepository';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import {
  CreditResponse,
  CreditListResponse,
  CreditEntryDto,
  creditListQuerySchema,
  userCreditsQuerySchema,
} from '../application/dto/credit.dto';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { UserRole } from '../domain/entities/User';
import { Resource, Action } from '../middleware/permissions';
import { logger } from '../utils/logger';

const router = Router();

// Lazy initialization to avoid database connection issues at module load
const getCreditService = () => {
  const creditEntryRepository = new CreditEntryRepository();
  const creditTransactionRepository = new CreditTransactionRepository();
  const projectRepository = new ProjectRepository();
  const userRepository = new UserRepository();

  return new CreditService(
    creditEntryRepository,
    creditTransactionRepository,
    projectRepository,
    userRepository
  );
};

/**
 * @swagger
 * /api/v1/credits/{id}:
 *   get:
 *     summary: Get credit by ID
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Credit entry ID
 *     responses:
 *       200:
 *         description: Credit retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     credit:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         creditId:
 *                           type: string
 *                           example: KRB-2024-001-000001
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         ownerId:
 *                           type: string
 *                           format: uuid
 *                         quantity:
 *                           type: number
 *                           example: 1000.00
 *                         vintage:
 *                           type: integer
 *                           example: 2024
 *                         status:
 *                           type: string
 *                           enum: [active, transferred, retired]
 *                         issuedAt:
 *                           type: string
 *                           format: date-time
 *                         lastActionAt:
 *                           type: string
 *                           format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Users can only access their own credits
 *       404:
 *         description: Credit not found
 */
router.get(
  '/:id',
  authenticate,
  authorize(Resource.CREDIT, Action.READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const creditId = req.params.id;
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;

      const creditService = getCreditService();
      const credit = await creditService.getCreditById(creditId);

      if (!credit) {
        return res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          title: 'Credit Not Found',
          detail: 'The requested credit does not exist',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Apply row-level security (Requirement 8.9: Users can only access their own credits)
      if (userRole !== UserRole.ADMINISTRATOR && credit.ownerId !== userId) {
        logger.warn('Unauthorized credit access attempt', {
          userId,
          userRole,
          creditId,
          creditOwnerId: credit.ownerId,
        });

        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          title: 'Access Denied',
          detail: 'You do not have permission to view this credit',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      const creditDto: CreditEntryDto = {
        id: credit.id,
        creditId: credit.creditId,
        projectId: credit.projectId,
        ownerId: credit.ownerId,
        quantity: credit.quantity,
        vintage: credit.vintage,
        status: credit.status,
        issuedAt: credit.issuedAt.toISOString(),
        lastActionAt: credit.lastActionAt.toISOString(),
        createdAt: credit.createdAt.toISOString(),
        updatedAt: credit.updatedAt.toISOString(),
      };

      const response: CreditResponse = {
        status: 'success',
        data: {
          credit: creditDto,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || 'unknown',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving credit', {
        error,
        creditId: req.params.id,
        userId: req.user?.id,
      });
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/credits:
 *   get:
 *     summary: List credits with filters and pagination
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, transferred, retired]
 *         description: Filter by credit status
 *       - in: query
 *         name: vintage
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Filter by vintage year
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of credits to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, issued_at, vintage, quantity]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Credits retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     credits:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         cursor:
 *                           type: string
 *                           nullable: true
 *                         hasMore:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  authorize(Resource.CREDIT, Action.READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;

      // Validate query parameters
      const queryValidation = creditListQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          title: 'Invalid Query Parameters',
          detail: queryValidation.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      const { status, vintage, limit, cursor, sortBy, sortOrder } = queryValidation.data;

      const filters: any = {};
      const pagination: any = {
        limit,
        cursor,
        sortBy,
        sortOrder,
      };

      // Apply filters based on query parameters
      if (status) {
        filters.status = status;
      }

      if (vintage) {
        filters.vintage = vintage;
      }

      // Apply row-level security (Requirement 8.9: Users can only access their own credits)
      if (userRole !== UserRole.ADMINISTRATOR) {
        filters.ownerId = userId;
      }

      const creditService = getCreditService();

      // Get credits with filters and pagination
      let credits;
      if (userRole === UserRole.ADMINISTRATOR) {
        // Administrators can see all credits
        credits = await creditService.getAllCredits(filters, pagination);
      } else {
        // All other users see only their own credits
        credits = await creditService.getCreditsByOwner(userId, filters, pagination);
      }

      // Get total count for pagination
      const totalCount = await creditService.countCredits(filters);

      // Generate next cursor from last item
      let nextCursor: string | null = null;
      if (credits.length === limit) {
        const lastCredit = credits[credits.length - 1];

        if (sortBy === 'created_at') {
          nextCursor = lastCredit.createdAt.toISOString();
        } else if (sortBy === 'updated_at') {
          nextCursor = lastCredit.updatedAt.toISOString();
        } else if (sortBy === 'issued_at') {
          nextCursor = lastCredit.issuedAt.toISOString();
        } else if (sortBy === 'vintage') {
          nextCursor = lastCredit.vintage.toString();
        } else if (sortBy === 'quantity') {
          nextCursor = lastCredit.quantity.toString();
        }
      }

      const creditsDto: CreditEntryDto[] = credits.map((credit) => ({
        id: credit.id,
        creditId: credit.creditId,
        projectId: credit.projectId,
        ownerId: credit.ownerId,
        quantity: credit.quantity,
        vintage: credit.vintage,
        status: credit.status,
        issuedAt: credit.issuedAt.toISOString(),
        lastActionAt: credit.lastActionAt.toISOString(),
        createdAt: credit.createdAt.toISOString(),
        updatedAt: credit.updatedAt.toISOString(),
      }));

      const response: CreditListResponse = {
        status: 'success',
        data: {
          credits: creditsDto,
          pagination: {
            total: totalCount,
            limit,
            cursor: nextCursor,
            hasMore: nextCursor !== null,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || 'unknown',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error listing credits', { error, userId: req.user?.id });
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}/credits:
 *   get:
 *     summary: Get credits owned by a specific user
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, transferred, retired]
 *         description: Filter by credit status
 *       - in: query
 *         name: vintage
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Filter by vintage year
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of credits to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, issued_at, vintage, quantity]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User credits retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Users can only access their own credits
 *       404:
 *         description: User not found
 */
router.get(
  '/users/:userId/credits',
  authenticate,
  authorize(Resource.CREDIT, Action.READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.userId;
      const currentUserId = req.user!.id;
      const userRole = req.user!.role as UserRole;

      // Apply row-level security (Requirement 8.9: Users can only access their own credits)
      if (userRole !== UserRole.ADMINISTRATOR && targetUserId !== currentUserId) {
        logger.warn('Unauthorized user credits access attempt', {
          currentUserId,
          targetUserId,
          userRole,
        });

        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          title: 'Access Denied',
          detail: 'You do not have permission to view credits for this user',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Validate query parameters
      const queryValidation = userCreditsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          title: 'Invalid Query Parameters',
          detail: queryValidation.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      const { status, vintage, limit, cursor, sortBy, sortOrder } = queryValidation.data;

      const filters: any = {};
      const pagination: any = {
        limit,
        cursor,
        sortBy,
        sortOrder,
      };

      // Apply filters based on query parameters
      if (status) {
        filters.status = status;
      }

      if (vintage) {
        filters.vintage = vintage;
      }

      const creditService = getCreditService();

      // Get credits for the specified user
      const credits = await creditService.getCreditsByOwner(targetUserId, filters, pagination);

      // Get total count for pagination
      const totalCount = await creditService.countCredits({ ...filters, ownerId: targetUserId });

      // Generate next cursor from last item
      let nextCursor: string | null = null;
      if (credits.length === limit) {
        const lastCredit = credits[credits.length - 1];

        if (sortBy === 'created_at') {
          nextCursor = lastCredit.createdAt.toISOString();
        } else if (sortBy === 'updated_at') {
          nextCursor = lastCredit.updatedAt.toISOString();
        } else if (sortBy === 'issued_at') {
          nextCursor = lastCredit.issuedAt.toISOString();
        } else if (sortBy === 'vintage') {
          nextCursor = lastCredit.vintage.toString();
        } else if (sortBy === 'quantity') {
          nextCursor = lastCredit.quantity.toString();
        }
      }

      const creditsDto: CreditEntryDto[] = credits.map((credit) => ({
        id: credit.id,
        creditId: credit.creditId,
        projectId: credit.projectId,
        ownerId: credit.ownerId,
        quantity: credit.quantity,
        vintage: credit.vintage,
        status: credit.status,
        issuedAt: credit.issuedAt.toISOString(),
        lastActionAt: credit.lastActionAt.toISOString(),
        createdAt: credit.createdAt.toISOString(),
        updatedAt: credit.updatedAt.toISOString(),
      }));

      const response: CreditListResponse = {
        status: 'success',
        data: {
          credits: creditsDto,
          pagination: {
            total: totalCount,
            limit,
            cursor: nextCursor,
            hasMore: nextCursor !== null,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || 'unknown',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving user credits', {
        error,
        targetUserId: req.params.userId,
        currentUserId: req.user?.id,
      });
      return next(error);
    }
  }
);

export const creditsRouter = router;
