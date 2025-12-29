import { Router, Request, Response, NextFunction } from 'express';
import { LinkedWalletRepository } from '../infrastructure/repositories/LinkedWalletRepository';
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
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { LinkedWallet } from '../domain/entities/LinkedWallet';

const router = Router();

// In-memory challenge store (for development - use Redis in production)
const challengeStore = new Map<string, { userId: string; message: string; expiresAt: Date }>();

// Lazy initialization to avoid database connection issues at module load
const getRepositories = () => {
  const walletRepository = new LinkedWalletRepository();
  const userRepository = new UserRepository();
  return { walletRepository, userRepository };
};

/**
 * Generate a challenge for wallet verification
 * NOTE: Challenge verification is handled by the frontend via web3 microservice
 * This endpoint generates the challenge; frontend verifies signature before linking
 */
const generateChallenge = (userId: string) => {
  const challengeId = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const message = `Sign this message to link your wallet to Karbonica.\n\nChallenge: ${challengeId}\nTimestamp: ${new Date().toISOString()}`;

  challengeStore.set(challengeId, { userId, message, expiresAt });

  return { challengeId, message, expiresAt };
};

/**
 * Verify a challenge (simple check - signature verification is frontend responsibility)
 */
const verifyChallenge = (challengeId: string, userId: string): boolean => {
  const challenge = challengeStore.get(challengeId);
  if (!challenge) return false;
  if (challenge.userId !== userId) return false;
  if (new Date() > challenge.expiresAt) {
    challengeStore.delete(challengeId);
    return false;
  }
  challengeStore.delete(challengeId);
  return true;
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
 */
router.post(
  '/challenge',
  authenticate,
  validateRequest(generateChallengeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const challenge = generateChallenge(userId);

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
 *     summary: Link a wallet to the user account
 *     description: |
 *       Links a wallet address to the user account. 
 *       NOTE: Signature verification should be done by frontend via web3 microservice 
 *       before calling this endpoint. This endpoint trusts the frontend's verification.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  validateRequest(linkWalletRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { challengeId, address, publicKey, stakeAddress } = req.body;
      // Note: signature is passed but verification is frontend responsibility

      const { walletRepository, userRepository } = getRepositories();

      // Verify challenge is valid (but not the signature - that's frontend's job)
      if (!verifyChallenge(challengeId, userId)) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_CHALLENGE',
          title: 'Invalid Challenge',
          detail: 'Challenge is invalid or expired',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Check if user already has a wallet linked
      const existingWallet = await walletRepository.findByUserId(userId);
      if (existingWallet && existingWallet.isActive) {
        return res.status(409).json({
          status: 'error',
          code: 'WALLET_ALREADY_LINKED',
          title: 'Wallet Already Linked',
          detail: 'User already has a wallet linked. Unlink the existing wallet first.',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Check if address is already linked to another user
      const addressWallet = await walletRepository.findByAddress(address);
      if (addressWallet && addressWallet.userId !== userId) {
        return res.status(409).json({
          status: 'error',
          code: 'ADDRESS_ALREADY_LINKED',
          title: 'Address Already Linked',
          detail: 'This wallet address is already linked to another account',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Create or reactivate wallet
      const now = new Date();
      let wallet: LinkedWallet;

      if (existingWallet) {
        // Reactivate existing wallet with new address
        wallet = await walletRepository.update({
          ...existingWallet,
          address,
          stakeAddress: stakeAddress || null,
          publicKey,
          isActive: true,
          linkedAt: now,
        });
      } else {
        // Create new wallet
        wallet = await walletRepository.save({
          id: uuidv4(),
          userId,
          address,
          stakeAddress: stakeAddress || null,
          publicKey,
          linkedAt: now,
          lastVerifiedAt: null,
          isActive: true,
          createdAt: now,
        });
      }

      // Update user's wallet address in users table (for backward compatibility)
      const user = await userRepository.findById(userId);
      if (user) {
        user.walletAddress = address;
        user.updatedAt = now;
        await userRepository.update(user);
      }

      logger.info('Wallet linked successfully', {
        userId,
        walletId: wallet.id,
        address,
      });

      const response: LinkWalletResponse = {
        status: 'success',
        data: {
          wallet: {
            id: wallet.id,
            userId: wallet.userId,
            address: wallet.address,
            stakeAddress: wallet.stakeAddress,
            isActive: wallet.isActive,
            linkedAt: wallet.linkedAt.toISOString(),
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
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/me/wallet:
 *   get:
 *     summary: Get the user's linked wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const { walletRepository } = getRepositories();
      const wallet = await walletRepository.findByUserId(userId);

      if (!wallet || !wallet.isActive) {
        return res.status(404).json({
          status: 'error',
          code: 'WALLET_NOT_FOUND',
          title: 'Wallet Not Found',
          detail: 'No wallet linked to this account',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      const response: GetWalletResponse = {
        status: 'success',
        data: {
          wallet: {
            id: wallet.id,
            userId: wallet.userId,
            address: wallet.address,
            stakeAddress: wallet.stakeAddress,
            isActive: wallet.isActive,
            linkedAt: wallet.linkedAt.toISOString(),
            lastVerifiedAt: wallet.lastVerifiedAt?.toISOString() || null,
          },
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
 *   delete:
 *     summary: Unlink the user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const { walletRepository, userRepository } = getRepositories();
      const wallet = await walletRepository.findByUserId(userId);

      if (!wallet || !wallet.isActive) {
        return res.status(404).json({
          status: 'error',
          code: 'WALLET_NOT_FOUND',
          title: 'Wallet Not Found',
          detail: 'No wallet linked to this account',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      }

      // Deactivate the wallet
      await walletRepository.update({
        ...wallet,
        isActive: false,
      });

      // Clear user's wallet address
      const user = await userRepository.findById(userId);
      if (user) {
        user.walletAddress = null;
        user.updatedAt = new Date();
        await userRepository.update(user);
      }

      logger.info('Wallet unlinked successfully', {
        userId,
        walletId: wallet.id,
      });

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
      return next(error);
    }
  }
);

export const walletRouter = router;
export default router;
