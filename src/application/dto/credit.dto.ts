import { z } from 'zod';
import { CreditStatus } from '../../domain/entities/CreditEntry';

/**
 * Credit Entry Response DTO
 */
export interface CreditEntryDto {
  id: string;
  creditId: string; // Serial number (KRB-YYYY-XXX-NNNNNN)
  projectId: string;
  ownerId: string;
  quantity: number;
  vintage: number;
  status: CreditStatus;
  issuedAt: string; // ISO string
  lastActionAt: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Credit Transaction Response DTO
 */
export interface CreditTransactionDto {
  id: string;
  creditId: string;
  transactionType: string;
  senderId?: string;
  recipientId?: string;
  quantity: number;
  status: string;
  blockchainTxHash?: string;
  metadata?: Record<string, any>;
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
}

/**
 * Single Credit Response
 */
export interface CreditResponse {
  status: 'success';
  data: {
    credit: CreditEntryDto;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Credit List Response
 */
export interface CreditListResponse {
  status: 'success';
  data: {
    credits: CreditEntryDto[];
    pagination: {
      total: number;
      limit: number;
      cursor: string | null;
      hasMore: boolean;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Credit Transaction History Response
 */
export interface CreditTransactionHistoryResponse {
  status: 'success';
  data: {
    transactions: CreditTransactionDto[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Credit List Query Parameters Schema
 */
export const creditListQuerySchema = z.object({
  status: z.enum(['active', 'transferred', 'retired']).optional(),
  vintage: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'issued_at', 'vintage', 'quantity'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreditListQuery = z.infer<typeof creditListQuerySchema>;

/**
 * User Credits Query Parameters Schema
 */
export const userCreditsQuerySchema = z.object({
  status: z.enum(['active', 'transferred', 'retired']).optional(),
  vintage: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'issued_at', 'vintage', 'quantity'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UserCreditsQuery = z.infer<typeof userCreditsQuerySchema>;
