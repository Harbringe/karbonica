import { Pool } from 'pg';
import { database } from '../../config/database';
import { IMarketplacePurchaseRepository } from '../../domain/repositories/IMarketplacePurchaseRepository';
import { MarketplacePurchase } from '../../domain/entities/MarketplacePurchase';

/**
 * MarketplacePurchaseRepository Implementation
 *
 * PostgreSQL implementation of the marketplace purchase repository.
 */
export class MarketplacePurchaseRepository implements IMarketplacePurchaseRepository {
    private pool: Pool;

    constructor() {
        this.pool = database.getPool();
    }

    async findById(id: string): Promise<MarketplacePurchase | null> {
        const query = `
      SELECT id, listing_id, buyer_id, seller_id, credit_entry_id,
             quantity, price_per_credit, total_price, currency,
             status, buyer_credit_entry_id, created_at, completed_at
      FROM marketplace_purchases
      WHERE id = $1
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    async findByBuyerId(buyerId: string): Promise<MarketplacePurchase[]> {
        const query = `
      SELECT id, listing_id, buyer_id, seller_id, credit_entry_id,
             quantity, price_per_credit, total_price, currency,
             status, buyer_credit_entry_id, created_at, completed_at
      FROM marketplace_purchases
      WHERE buyer_id = $1
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [buyerId]);
        return result.rows.map(this.mapRow);
    }

    async findBySellerId(sellerId: string): Promise<MarketplacePurchase[]> {
        const query = `
      SELECT id, listing_id, buyer_id, seller_id, credit_entry_id,
             quantity, price_per_credit, total_price, currency,
             status, buyer_credit_entry_id, created_at, completed_at
      FROM marketplace_purchases
      WHERE seller_id = $1
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [sellerId]);
        return result.rows.map(this.mapRow);
    }

    async findByListingId(listingId: string): Promise<MarketplacePurchase[]> {
        const query = `
      SELECT id, listing_id, buyer_id, seller_id, credit_entry_id,
             quantity, price_per_credit, total_price, currency,
             status, buyer_credit_entry_id, created_at, completed_at
      FROM marketplace_purchases
      WHERE listing_id = $1
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [listingId]);
        return result.rows.map(this.mapRow);
    }

    async save(purchase: MarketplacePurchase): Promise<MarketplacePurchase> {
        const query = `
      INSERT INTO marketplace_purchases (
        id, listing_id, buyer_id, seller_id, credit_entry_id,
        quantity, price_per_credit, total_price, currency,
        status, buyer_credit_entry_id, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
        const values = [
            purchase.id,
            purchase.listingId,
            purchase.buyerId,
            purchase.sellerId,
            purchase.creditEntryId,
            purchase.quantity,
            purchase.pricePerCredit,
            purchase.totalPrice,
            purchase.currency,
            purchase.status,
            purchase.buyerCreditEntryId,
            purchase.createdAt,
            purchase.completedAt,
        ];
        const result = await this.pool.query(query, values);
        return this.mapRow(result.rows[0]);
    }

    async update(purchase: MarketplacePurchase): Promise<MarketplacePurchase> {
        const query = `
      UPDATE marketplace_purchases SET
        status = $2,
        buyer_credit_entry_id = $3,
        completed_at = $4
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            purchase.id,
            purchase.status,
            purchase.buyerCreditEntryId,
            purchase.completedAt,
        ];
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) throw new Error('Purchase not found');
        return this.mapRow(result.rows[0]);
    }

    private mapRow(row: any): MarketplacePurchase {
        return {
            id: row.id,
            listingId: row.listing_id,
            buyerId: row.buyer_id,
            sellerId: row.seller_id,
            creditEntryId: row.credit_entry_id,
            quantity: parseInt(row.quantity, 10),
            pricePerCredit: parseFloat(row.price_per_credit),
            totalPrice: parseFloat(row.total_price),
            currency: row.currency,
            status: row.status,
            buyerCreditEntryId: row.buyer_credit_entry_id,
            createdAt: row.created_at,
            completedAt: row.completed_at,
        };
    }
}
