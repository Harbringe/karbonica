import { MarketplacePurchase } from '../entities/MarketplacePurchase';

/**
 * IMarketplacePurchaseRepository Interface
 *
 * Repository interface for marketplace purchase operations.
 */
export interface IMarketplacePurchaseRepository {
    findById(id: string): Promise<MarketplacePurchase | null>;
    findByBuyerId(buyerId: string): Promise<MarketplacePurchase[]>;
    findBySellerId(sellerId: string): Promise<MarketplacePurchase[]>;
    findByListingId(listingId: string): Promise<MarketplacePurchase[]>;
    save(purchase: MarketplacePurchase): Promise<MarketplacePurchase>;
    update(purchase: MarketplacePurchase): Promise<MarketplacePurchase>;
}
