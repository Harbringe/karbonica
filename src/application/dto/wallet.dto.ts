import { z } from 'zod';

/**
 * Wallet DTOs
 *
 * Data transfer objects for Cardano wallet operations.
 * Requirements: 2.3, 2.4, 2.8, 2.9
 */

// Generate challenge request schema
// Empty object schema - no body data needed, userId comes from auth token
export const generateChallengeRequestSchema = z.object({}).optional();

// Link wallet request schema
export const linkWalletRequestSchema = z.object({
  challengeId: z.string().uuid('Challenge ID must be a valid UUID'),
  address: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^addr(_test)?1[a-z0-9]+$/, 'Invalid Cardano address format'),
  signature: z
    .string()
    .min(1, 'Signature is required')
    .regex(/^[0-9a-fA-F]+$/, 'Signature must be a hexadecimal string'),
  publicKey: z
    .string()
    .min(1, 'Public key is required')
    .regex(/^[0-9a-fA-F]+$/, 'Public key must be a hexadecimal string'),
  stakeAddress: z
    .string()
    .regex(/^stake(_test)?1[a-z0-9]+$/, 'Invalid stake address format')
    .optional(),
});

// Response types
export interface GenerateChallengeResponse {
  status: 'success';
  data: {
    challengeId: string;
    message: string;
    expiresAt: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface LinkWalletResponse {
  status: 'success';
  data: {
    wallet: {
      id: string;
      userId: string;
      address: string;
      stakeAddress: string | null;
      linkedAt: string;
      isActive: boolean;
    };
    message: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface GetWalletResponse {
  status: 'success';
  data: {
    wallet: {
      id: string;
      userId: string;
      address: string;
      stakeAddress: string | null;
      linkedAt: string;
      lastVerifiedAt: string | null;
      isActive: boolean;
    } | null;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface UnlinkWalletResponse {
  status: 'success';
  data: {
    message: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// Verify wallet authentication request schema
export const verifyWalletRequestSchema = z.object({
  challengeId: z.string().uuid('Challenge ID must be a valid UUID'),
  address: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^addr(_test)?1[a-z0-9]+$/, 'Invalid Cardano address format'),
  signature: z
    .string()
    .min(1, 'Signature is required')
    .regex(/^[0-9a-fA-F]+$/, 'Signature must be a hexadecimal string'),
  publicKey: z
    .string()
    .min(1, 'Public key is required')
    .regex(/^[0-9a-fA-F]+$/, 'Public key must be a hexadecimal string'),
});

export interface VerifyWalletResponse {
  status: 'success';
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      company: string | null;
      role: string;
      emailVerified: boolean;
      walletAddress: string;
      lastLoginAt: Date | null;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      accessTokenExpiry: Date;
      refreshTokenExpiry: Date;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
