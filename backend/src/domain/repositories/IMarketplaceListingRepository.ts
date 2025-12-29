import { MarketplaceListing, ListingFilters } from '../entities/MarketplaceListing';

/**
 * IMarketplaceListingRepository Interface
 *
 * Repository interface for marketplace listing operations.
 */
export interface IMarketplaceListingRepository {
    findById(id: string): Promise<MarketplaceListing | null>;
    findBySellerId(sellerId: string): Promise<MarketplaceListing[]>;
    findByStatus(status: string): Promise<MarketplaceListing[]>;
    findActive(filters?: ListingFilters, limit?: number, offset?: number): Promise<MarketplaceListing[]>;
    countActive(filters?: ListingFilters): Promise<number>;
    save(listing: MarketplaceListing): Promise<MarketplaceListing>;
    update(listing: MarketplaceListing): Promise<MarketplaceListing>;
    delete(id: string): Promise<void>;
}
