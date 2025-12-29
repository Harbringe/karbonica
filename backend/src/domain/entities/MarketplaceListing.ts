/**
 * MarketplaceListing Entity
 *
 * Represents a credit listing for sale on the marketplace.
 * Pure Web2 implementation - no blockchain dependencies.
 */

export type ListingStatus = 'active' | 'sold' | 'partially_sold' | 'cancelled' | 'expired';

export interface MarketplaceListing {
    id: string;
    sellerId: string;
    creditEntryId: string;
    projectId: string;

    // Quantity and pricing
    quantityAvailable: number;
    quantityOriginal: number;
    pricePerCredit: number;
    currency: 'USD';

    // Listing details
    title: string;
    description: string | null;

    // Status
    status: ListingStatus;
    expiresAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateListingData {
    sellerId: string;
    creditEntryId: string;
    projectId: string;
    quantity: number;
    pricePerCredit: number;
    title: string;
    description?: string;
    expiresAt?: Date;
}

export interface ListingFilters {
    status?: ListingStatus;
    projectId?: string;
    sellerId?: string;
    minPrice?: number;
    maxPrice?: number;
    projectType?: string;
}
