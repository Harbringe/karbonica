import { z } from 'zod';

/**
 * Marketplace DTOs
 * 
 * Data transfer objects for marketplace operations.
 */

// Create listing request
export const createListingSchema = z.object({
    creditEntryId: z.string().uuid('Credit entry ID must be a valid UUID'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    pricePerCredit: z.number().positive('Price per credit must be positive'),
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().max(2000).optional(),
    expiresInDays: z.number().int().positive().max(365).optional(),
});

// Update listing request
export const updateListingSchema = z.object({
    pricePerCredit: z.number().positive().optional(),
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).optional(),
    expiresInDays: z.number().int().positive().max(365).optional(),
});

// Purchase request
export const purchaseSchema = z.object({
    listingId: z.string().uuid('Listing ID must be a valid UUID'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
});

// Query params for listings
export const listingsQuerySchema = z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    projectId: z.string().uuid().optional(),
    projectType: z.string().optional(),
    minPrice: z.string().transform(Number).optional(),
    maxPrice: z.string().transform(Number).optional(),
});

// Response types
export interface ListingDto {
    id: string;
    sellerId: string;
    sellerName?: string;
    creditEntryId: string;
    projectId: string;
    projectName?: string;
    projectType?: string;
    quantityAvailable: number;
    quantityOriginal: number;
    pricePerCredit: number;
    currency: string;
    title: string;
    description: string | null;
    status: string;
    expiresAt: string | null;
    createdAt: string;
}

export interface PurchaseDto {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    quantity: number;
    pricePerCredit: number;
    totalPrice: number;
    currency: string;
    status: string;
    buyerCreditEntryId: string | null;
    createdAt: string;
    completedAt: string | null;
}

export interface ListingsResponse {
    status: 'success';
    data: {
        listings: ListingDto[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
    meta: {
        timestamp: string;
        requestId: string;
    };
}

export interface ListingResponse {
    status: 'success';
    data: {
        listing: ListingDto;
    };
    meta: {
        timestamp: string;
        requestId: string;
    };
}

export interface PurchaseResponse {
    status: 'success';
    data: {
        purchase: PurchaseDto;
        message: string;
    };
    meta: {
        timestamp: string;
        requestId: string;
    };
}

export interface PurchasesResponse {
    status: 'success';
    data: {
        purchases: PurchaseDto[];
    };
    meta: {
        timestamp: string;
        requestId: string;
    };
}
