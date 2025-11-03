import { Router, Request, Response, NextFunction } from 'express';
import { CardanoWalletService } from '../domain/services/CardanoWalletService';
import { CardanoWalletRepository } from '../infrastructure/repositories/CardanoWalletRepository';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validation';
import {
  generateChallengeRequestSchema,
  linkWalletRequestSchema,
  GenerateChallengeResponse,
  LinkWalletResponse,
  GetWalletResponse,
  UnlinkWalletResponse,
} from '../application/dto/wallet.dto';

const router = Router();

// Lazy initialization to avoid database connection issues at module load
const getWalletService = () => {
  const walletRepository = new CardanoWalletRepository();
  const userRepository = new UserRepository();
  return new CardanoWalletService(walletRepository, userRepository);
};

/**
 * @swagger
 * /api/v1/users/me/wallet/challenge:
 *   post:
 *     summary: Generate a challenge for wallet verification
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Challenge generated successfully
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
 *                     challengeId:
 *                       type: string
 *                       format: uuid
 *                     message:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/challenge',
  authenticate,
  validateRequest(generateChallengeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const walletService = getWalletService();
      const challenge = walletService.generateChallenge(userId);

      const response: GenerateChallengeResponse = {
        status: 'success',
        data: {
          challengeId: challenge.challengeId,
          message: challenge.message,
          expiresAt: challenge.expiresAt.toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || 'unknown',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/me/wallet:
 *   post:
 *     summary: Link a Cardano wallet to the user account
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *               - address
 *               - signature
 *               - publicKey
 *             properties:
 *               challengeId:
 *                 type: string
 *                 format: uuid
 *               address:
 *                 type: string
 *                 description: Cardano wallet address (Bech32 format)
 *               signature:
 *                 type: string
 *                 description: Ed25519 signature (hex)
 *               publicKey:
 *                 type: string
 *                 description: Public key (hex)
 *               stakeAddress:
 *                 type: string
 *                 description: Stake address (optional)
 *     responses:
 *       201:
 *         description: Wallet linked successfully
 *       400:
 *         description: Invalid request or validation failed
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Wallet already linked
 */
router.post(
  '/',
  authenticate,
  validateRequest(linkWalletRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { challengeId, address, signature, publicKey, stakeAddress } = req.body;

      const walletService = getWalletService();
      const wallet = await walletService.linkWallet(
        userId,
        challengeId,
        address,
        signature,
        publicKey,
        stakeAddress
      );

      const response: LinkWalletResponse = {
        status: 'success',
        data: {
          wallet: {
            id: wallet.id,
            userId: wallet.userId,
            address: wallet.address,
            stakeAddress: wallet.stakeAddress,
            linkedAt: wallet.linkedAt.toISOString(),
            isActive: wallet.isActive,
          },
          message: 'Wallet linked successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || 'unknown',
        },
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            status: 'error',
            code: 'USER_NOT_FOUND',
            title: 'User Not Found',
            detail: 'The user account was not found',
            meta: {
              timestamp: new Date().toISOString(),
              requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
          });
        }

        if (
          error.message === 'Invalid Cardano address format or network mismatch' ||
          error.message === 'Invalid signature or expired challenge'
        ) {
          return res.status(400).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            title: 'Validation Error',
            detail: error.message,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
          });
        }

        if (
          error.message === 'Wallet address already linked to another account' ||
          error.message === 'User already has a wallet linked'
        ) {
          return res.status(409).json({
            status: 'error',
            code: 'WALLET_ALREADY_LINKED',
            title: 'Wallet Already Linked',
            detail: error.message,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
          });
        }
      }

      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/me/wallet:
 *   get:
 *     summary: Get the linked Cardano wallet for the current user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const walletService = getWalletService();
    const wallet = await walletService.getWalletByUserId(userId);

    const response: GetWalletResponse = {
      status: 'success',
      data: {
        wallet: wallet
          ? {
              id: wallet.id,
              userId: wallet.userId,
              address: wallet.address,
              stakeAddress: wallet.stakeAddress,
              linkedAt: wallet.linkedAt.toISOString(),
              lastVerifiedAt: wallet.lastVerifiedAt?.toISOString() || null,
              isActive: wallet.isActive,
            }
          : null,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/v1/users/me/wallet:
 *   delete:
 *     summary: Unlink the Cardano wallet from the user account
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet unlinked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No wallet linked
 */
router.delete('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const walletService = getWalletService();
    await walletService.unlinkWallet(userId);

    const response: UnlinkWalletResponse = {
      status: 'success',
      data: {
        message: 'Wallet unlinked successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'No wallet linked to this account') {
        return res.status(404).json({
          status: 'error',
          code: 'WALLET_NOT_FOUND',
          title: 'Wallet Not Found',
          detail: 'No wallet is linked to this account',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }
    }

    return next(error);
  }
});

export const walletRouter = router;
