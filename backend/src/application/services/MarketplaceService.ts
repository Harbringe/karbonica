import { v4 as uuidv4 } from 'uuid';
import { IMarketplaceListingRepository } from '../../domain/repositories/IMarketplaceListingRepository';
import { IMarketplacePurchaseRepository } from '../../domain/repositories/IMarketplacePurchaseRepository';
import { ICreditEntryRepository } from '../../domain/repositories/ICreditEntryRepository';
import { MarketplaceListing, CreateListingData, ListingFilters } from '../../domain/entities/MarketplaceListing';
import { MarketplacePurchase } from '../../domain/entities/MarketplacePurchase';
import { CreditStatus, generateCreditSerialNumber } from '../../domain/entities/CreditEntry';
import { logger } from '../../utils/logger';

/**
 * MarketplaceService
 * 
 * Handles marketplace operations for buying and selling carbon credits.
 * Pure Web2 implementation - no blockchain dependencies.
 */
export class MarketplaceService {
    constructor(
        private listingRepository: IMarketplaceListingRepository,
        private purchaseRepository: IMarketplacePurchaseRepository,
        private creditEntryRepository: ICreditEntryRepository
    ) { }

    /**
     * Create a new listing for selling credits
     */
    async createListing(data: CreateListingData): Promise<MarketplaceListing> {
        // Verify credit entry exists and belongs to seller
        const creditEntry = await this.creditEntryRepository.findById(data.creditEntryId);
        if (!creditEntry) {
            throw new Error('Credit entry not found');
        }
        if (creditEntry.ownerId !== data.sellerId) {
            throw new Error('You can only sell credits you own');
        }
        if (creditEntry.status !== CreditStatus.ACTIVE) {
            throw new Error('Only active credits can be listed for sale');
        }

        // Check available quantity
        const availableQuantity = creditEntry.quantity;
        if (data.quantity > availableQuantity) {
            throw new Error(`Insufficient credits. Available: ${availableQuantity}`);
        }

        // Create listing
        const now = new Date();
        const listing: MarketplaceListing = {
            id: uuidv4(),
            sellerId: data.sellerId,
            creditEntryId: data.creditEntryId,
            projectId: data.projectId,
            quantityAvailable: data.quantity,
            quantityOriginal: data.quantity,
            pricePerCredit: data.pricePerCredit,
            currency: 'USD',
            title: data.title,
            description: data.description || null,
            status: 'active',
            expiresAt: data.expiresAt || null,
            createdAt: now,
            updatedAt: now,
        };

        const savedListing = await this.listingRepository.save(listing);

        logger.info('Listing created', {
            listingId: savedListing.id,
            sellerId: data.sellerId,
            quantity: data.quantity,
            price: data.pricePerCredit,
        });

        return savedListing;
    }

    /**
     * Get active listings with optional filters
     */
    async getListings(
        filters?: ListingFilters,
        page = 1,
        limit = 20
    ): Promise<{ listings: MarketplaceListing[]; total: number }> {
        const offset = (page - 1) * limit;
        const listings = await this.listingRepository.findActive(filters, limit, offset);
        const total = await this.listingRepository.countActive(filters);
        return { listings, total };
    }

    /**
     * Get a single listing by ID
     */
    async getListing(id: string): Promise<MarketplaceListing | null> {
        return this.listingRepository.findById(id);
    }

    /**
     * Get seller's listings
     */
    async getSellerListings(sellerId: string): Promise<MarketplaceListing[]> {
        return this.listingRepository.findBySellerId(sellerId);
    }

    /**
     * Update a listing
     */
    async updateListing(
        listingId: string,
        sellerId: string,
        updates: Partial<Pick<MarketplaceListing, 'pricePerCredit' | 'title' | 'description' | 'expiresAt'>>
    ): Promise<MarketplaceListing> {
        const listing = await this.listingRepository.findById(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }
        if (listing.sellerId !== sellerId) {
            throw new Error('You can only update your own listings');
        }
        if (listing.status !== 'active') {
            throw new Error('Only active listings can be updated');
        }

        const updatedListing = {
            ...listing,
            ...updates,
            updatedAt: new Date(),
        };

        return this.listingRepository.update(updatedListing);
    }

    /**
     * Cancel a listing
     */
    async cancelListing(listingId: string, sellerId: string): Promise<void> {
        const listing = await this.listingRepository.findById(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }
        if (listing.sellerId !== sellerId) {
            throw new Error('You can only cancel your own listings');
        }
        if (listing.status !== 'active' && listing.status !== 'partially_sold') {
            throw new Error('This listing cannot be cancelled');
        }

        await this.listingRepository.update({
            ...listing,
            status: 'cancelled',
            updatedAt: new Date(),
        });

        logger.info('Listing cancelled', { listingId, sellerId });
    }

    /**
     * Purchase credits from a listing
     */
    async purchaseCredits(
        listingId: string,
        buyerId: string,
        quantity: number
    ): Promise<MarketplacePurchase> {
        // Get listing
        const listing = await this.listingRepository.findById(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }
        if (listing.status !== 'active' && listing.status !== 'partially_sold') {
            throw new Error('This listing is not available for purchase');
        }
        if (listing.sellerId === buyerId) {
            throw new Error('You cannot purchase your own listing');
        }
        if (quantity > listing.quantityAvailable) {
            throw new Error(`Insufficient quantity. Available: ${listing.quantityAvailable}`);
        }
        if (listing.expiresAt && new Date() > listing.expiresAt) {
            throw new Error('This listing has expired');
        }

        // Get seller's credit entry
        const sellerCredit = await this.creditEntryRepository.findById(listing.creditEntryId);
        if (!sellerCredit) {
            throw new Error('Seller credit entry not found');
        }

        // Calculate total price
        const totalPrice = quantity * listing.pricePerCredit;

        // Create purchase record
        const now = new Date();
        const purchase: MarketplacePurchase = {
            id: uuidv4(),
            listingId,
            buyerId,
            sellerId: listing.sellerId,
            creditEntryId: listing.creditEntryId,
            quantity,
            pricePerCredit: listing.pricePerCredit,
            totalPrice,
            currency: 'USD',
            status: 'pending',
            buyerCreditEntryId: null,
            createdAt: now,
            completedAt: null,
        };

        const savedPurchase = await this.purchaseRepository.save(purchase);

        try {
            // Transfer credits from seller to buyer (Web2 - just database update)
            // Reduce seller's credit quantity
            sellerCredit.quantity -= quantity;
            if (sellerCredit.quantity === 0) {
                sellerCredit.status = CreditStatus.TRANSFERRED;
            }
            sellerCredit.updatedAt = now;
            await this.creditEntryRepository.update(sellerCredit);

            // Create new credit entry for buyer
            const buyerCredit = await this.creditEntryRepository.save({
                id: uuidv4(),
                creditId: generateCreditSerialNumber(sellerCredit.vintage, 1, Date.now() % 1000000),
                projectId: sellerCredit.projectId,
                ownerId: buyerId,
                quantity,
                vintage: sellerCredit.vintage,
                status: CreditStatus.ACTIVE,
                issuedAt: now,
                lastActionAt: now,
                createdAt: now,
                updatedAt: now,
                metadata: {
                    purchasedFrom: listing.sellerId,
                    purchaseId: savedPurchase.id,
                    originalCreditId: sellerCredit.creditId,
                },
            });

            // Update purchase with buyer credit entry
            savedPurchase.buyerCreditEntryId = buyerCredit.id;
            savedPurchase.status = 'completed';
            savedPurchase.completedAt = now;
            await this.purchaseRepository.update(savedPurchase);

            // Update listing quantity and status
            listing.quantityAvailable -= quantity;
            listing.status = listing.quantityAvailable === 0 ? 'sold' : 'partially_sold';
            listing.updatedAt = now;
            await this.listingRepository.update(listing);

            logger.info('Purchase completed', {
                purchaseId: savedPurchase.id,
                listingId,
                buyerId,
                sellerId: listing.sellerId,
                quantity,
                totalPrice,
            });

            return savedPurchase;

        } catch (error) {
            // Mark purchase as failed
            savedPurchase.status = 'failed';
            await this.purchaseRepository.update(savedPurchase);
            throw error;
        }
    }

    /**
     * Get buyer's purchases
     */
    async getBuyerPurchases(buyerId: string): Promise<MarketplacePurchase[]> {
        return this.purchaseRepository.findByBuyerId(buyerId);
    }

    /**
     * Get seller's sales
     */
    async getSellerSales(sellerId: string): Promise<MarketplacePurchase[]> {
        return this.purchaseRepository.findBySellerId(sellerId);
    }
}
