import { Pool } from 'pg';
import { database } from '../../config/database';
import { IMarketplaceListingRepository } from '../../domain/repositories/IMarketplaceListingRepository';
import { MarketplaceListing, ListingFilters } from '../../domain/entities/MarketplaceListing';

/**
 * MarketplaceListingRepository Implementation
 *
 * PostgreSQL implementation of the marketplace listing repository.
 */
export class MarketplaceListingRepository implements IMarketplaceListingRepository {
    private pool: Pool;

    constructor() {
        this.pool = database.getPool();
    }

    async findById(id: string): Promise<MarketplaceListing | null> {
        const query = `
      SELECT id, seller_id, credit_entry_id, project_id,
             quantity_available, quantity_original, price_per_credit, currency,
             title, description, status, expires_at, created_at, updated_at
      FROM marketplace_listings
      WHERE id = $1
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    async findBySellerId(sellerId: string): Promise<MarketplaceListing[]> {
        const query = `
      SELECT id, seller_id, credit_entry_id, project_id,
             quantity_available, quantity_original, price_per_credit, currency,
             title, description, status, expires_at, created_at, updated_at
      FROM marketplace_listings
      WHERE seller_id = $1
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [sellerId]);
        return result.rows.map(this.mapRow);
    }

    async findByStatus(status: string): Promise<MarketplaceListing[]> {
        const query = `
      SELECT id, seller_id, credit_entry_id, project_id,
             quantity_available, quantity_original, price_per_credit, currency,
             title, description, status, expires_at, created_at, updated_at
      FROM marketplace_listings
      WHERE status = $1
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [status]);
        return result.rows.map(this.mapRow);
    }

    async findActive(filters?: ListingFilters, limit = 50, offset = 0): Promise<MarketplaceListing[]> {
        let query = `
      SELECT ml.id, ml.seller_id, ml.credit_entry_id, ml.project_id,
             ml.quantity_available, ml.quantity_original, ml.price_per_credit, ml.currency,
             ml.title, ml.description, ml.status, ml.expires_at, ml.created_at, ml.updated_at
      FROM marketplace_listings ml
      LEFT JOIN projects p ON ml.project_id = p.id
      WHERE ml.status = 'active'
        AND (ml.expires_at IS NULL OR ml.expires_at > NOW())
    `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filters?.projectId) {
            query += ` AND ml.project_id = $${paramIndex++}`;
            params.push(filters.projectId);
        }
        if (filters?.minPrice !== undefined) {
            query += ` AND ml.price_per_credit >= $${paramIndex++}`;
            params.push(filters.minPrice);
        }
        if (filters?.maxPrice !== undefined) {
            query += ` AND ml.price_per_credit <= $${paramIndex++}`;
            params.push(filters.maxPrice);
        }
        if (filters?.projectType) {
            query += ` AND p.project_type = $${paramIndex++}`;
            params.push(filters.projectType);
        }

        query += ` ORDER BY ml.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await this.pool.query(query, params);
        return result.rows.map(this.mapRow);
    }

    async countActive(filters?: ListingFilters): Promise<number> {
        let query = `
      SELECT COUNT(*) as count
      FROM marketplace_listings ml
      LEFT JOIN projects p ON ml.project_id = p.id
      WHERE ml.status = 'active'
        AND (ml.expires_at IS NULL OR ml.expires_at > NOW())
    `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filters?.projectId) {
            query += ` AND ml.project_id = $${paramIndex++}`;
            params.push(filters.projectId);
        }
        if (filters?.minPrice !== undefined) {
            query += ` AND ml.price_per_credit >= $${paramIndex++}`;
            params.push(filters.minPrice);
        }
        if (filters?.maxPrice !== undefined) {
            query += ` AND ml.price_per_credit <= $${paramIndex++}`;
            params.push(filters.maxPrice);
        }

        const result = await this.pool.query(query, params);
        return parseInt(result.rows[0].count, 10);
    }

    async save(listing: MarketplaceListing): Promise<MarketplaceListing> {
        const query = `
      INSERT INTO marketplace_listings (
        id, seller_id, credit_entry_id, project_id,
        quantity_available, quantity_original, price_per_credit, currency,
        title, description, status, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
        const values = [
            listing.id,
            listing.sellerId,
            listing.creditEntryId,
            listing.projectId,
            listing.quantityAvailable,
            listing.quantityOriginal,
            listing.pricePerCredit,
            listing.currency,
            listing.title,
            listing.description,
            listing.status,
            listing.expiresAt,
            listing.createdAt,
            listing.updatedAt,
        ];
        const result = await this.pool.query(query, values);
        return this.mapRow(result.rows[0]);
    }

    async update(listing: MarketplaceListing): Promise<MarketplaceListing> {
        const query = `
      UPDATE marketplace_listings SET
        quantity_available = $2,
        price_per_credit = $3,
        title = $4,
        description = $5,
        status = $6,
        expires_at = $7,
        updated_at = $8
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            listing.id,
            listing.quantityAvailable,
            listing.pricePerCredit,
            listing.title,
            listing.description,
            listing.status,
            listing.expiresAt,
            new Date(),
        ];
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) throw new Error('Listing not found');
        return this.mapRow(result.rows[0]);
    }

    async delete(id: string): Promise<void> {
        await this.pool.query('DELETE FROM marketplace_listings WHERE id = $1', [id]);
    }

    private mapRow(row: any): MarketplaceListing {
        return {
            id: row.id,
            sellerId: row.seller_id,
            creditEntryId: row.credit_entry_id,
            projectId: row.project_id,
            quantityAvailable: parseInt(row.quantity_available, 10),
            quantityOriginal: parseInt(row.quantity_original, 10),
            pricePerCredit: parseFloat(row.price_per_credit),
            currency: row.currency,
            title: row.title,
            description: row.description,
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
