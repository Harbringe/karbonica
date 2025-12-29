/**
 * MarketplacePurchase Entity
 *
 * Represents a purchase transaction on the marketplace.
 * Pure Web2 implementation - no blockchain dependencies.
 */

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface MarketplacePurchase {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    creditEntryId: string;

    // Purchase details
    quantity: number;
    pricePerCredit: number;
    totalPrice: number;
    currency: 'USD';

    // Status tracking
    status: PurchaseStatus;

    // Reference to created credit entry for buyer
    buyerCreditEntryId: string | null;

    // Timestamps
    createdAt: Date;
    completedAt: Date | null;
}

export interface CreatePurchaseData {
    listingId: string;
    buyerId: string;
    quantity: number;
}
