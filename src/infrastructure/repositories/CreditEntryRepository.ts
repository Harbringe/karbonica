import { Pool } from 'pg';
import { CreditEntry, CreditStatus } from '../../domain/entities/CreditEntry';
import { ICreditEntryRepository } from '../../domain/repositories/ICreditEntryRepository';
import { database } from '../../config/database';
import { logger } from '../../utils/logger';

export class CreditEntryRepository implements ICreditEntryRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async findById(id: string): Promise<CreditEntry | null> {
    const query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCreditEntry(result.rows[0]);
    } catch (error) {
      logger.error('Error finding credit entry by ID', { error, id });
      throw error;
    }
  }

  async findByCreditId(creditId: string): Promise<CreditEntry | null> {
    const query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE credit_id = $1
    `;

    try {
      const result = await this.pool.query(query, [creditId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCreditEntry(result.rows[0]);
    } catch (error) {
      logger.error('Error finding credit entry by credit ID', { error, creditId });
      throw error;
    }
  }

  async findByOwner(ownerId: string, filters?: any, pagination?: any): Promise<CreditEntry[]> {
    let query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE owner_id = $1
    `;

    const params: any[] = [ownerId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.vintage) {
      query += ` AND vintage = $${paramIndex}`;
      params.push(filters.vintage);
      paramIndex++;
    }

    // Apply sorting
    const sortBy = pagination?.sortBy || 'created_at';
    const sortOrder = pagination?.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Apply pagination
    if (pagination?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(pagination.limit);
      paramIndex++;
    }

    if (pagination?.cursor) {
      // Cursor-based pagination implementation would go here
      // For now, using simple offset
      if (pagination?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(pagination.offset);
      }
    }

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToCreditEntry(row));
    } catch (error) {
      logger.error('Error finding credit entries by owner', {
        error,
        ownerId,
        filters,
        pagination,
      });
      throw error;
    }
  }

  async findByProject(projectId: string): Promise<CreditEntry[]> {
    const query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [projectId]);
      return result.rows.map((row) => this.mapRowToCreditEntry(row));
    } catch (error) {
      logger.error('Error finding credit entries by project', { error, projectId });
      throw error;
    }
  }

  async save(creditEntry: CreditEntry): Promise<CreditEntry> {
    const query = `
      INSERT INTO credit_entries (
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
    `;

    const params = [
      creditEntry.id,
      creditEntry.creditId,
      creditEntry.projectId,
      creditEntry.ownerId,
      creditEntry.quantity,
      creditEntry.vintage,
      creditEntry.status,
      creditEntry.issuedAt,
      creditEntry.lastActionAt,
      creditEntry.createdAt,
      creditEntry.updatedAt,
    ];

    try {
      const result = await this.pool.query(query, params);
      return this.mapRowToCreditEntry(result.rows[0]);
    } catch (error) {
      logger.error('Error saving credit entry', { error, creditEntry });
      throw error;
    }
  }

  async update(creditEntry: CreditEntry): Promise<CreditEntry> {
    const query = `
      UPDATE credit_entries 
      SET 
        owner_id = $2,
        quantity = $3,
        status = $4,
        last_action_at = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
    `;

    const params = [
      creditEntry.id,
      creditEntry.ownerId,
      creditEntry.quantity,
      creditEntry.status,
      creditEntry.lastActionAt,
    ];

    try {
      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Credit entry not found');
      }

      return this.mapRowToCreditEntry(result.rows[0]);
    } catch (error) {
      logger.error('Error updating credit entry', { error, creditEntry });
      throw error;
    }
  }

  async lockForUpdate(id: string): Promise<CreditEntry | null> {
    const query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE id = $1
      FOR UPDATE
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCreditEntry(result.rows[0]);
    } catch (error) {
      logger.error('Error locking credit entry for update', { error, id });
      throw error;
    }
  }

  async getNextCreditSequence(projectId: string, vintage: number): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(
        CAST(SUBSTRING(credit_id FROM 'KRB-[0-9]{4}-[0-9]{3}-([0-9]{6})') AS INTEGER)
      ), 0) + 1 as next_sequence
      FROM credit_entries 
      WHERE project_id = $1 AND vintage = $2
    `;

    try {
      const result = await this.pool.query(query, [projectId, vintage]);
      return result.rows[0].next_sequence || 1;
    } catch (error) {
      logger.error('Error getting next credit sequence', { error, projectId, vintage });
      throw error;
    }
  }

  async getProjectSequence(projectId: string): Promise<number> {
    const query = `
      SELECT ROW_NUMBER() OVER (ORDER BY created_at) as sequence
      FROM projects 
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [projectId]);
      return result.rows[0]?.sequence || 1;
    } catch (error) {
      logger.error('Error getting project sequence', { error, projectId });
      // Fallback: use a hash of the project ID to generate a sequence
      const hash = projectId.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      return (Math.abs(hash) % 999) + 1; // Ensure 3-digit sequence
    }
  }

  async findAll(filters?: any, pagination?: any): Promise<CreditEntry[]> {
    let query = `
      SELECT 
        id, credit_id, project_id, owner_id, quantity, vintage, status,
        issued_at, last_action_at, created_at, updated_at
      FROM credit_entries 
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters?.ownerId) {
      query += ` AND owner_id = $${paramIndex}`;
      params.push(filters.ownerId);
      paramIndex++;
    }

    if (filters?.projectId) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.projectId);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.vintage) {
      query += ` AND vintage = $${paramIndex}`;
      params.push(filters.vintage);
      paramIndex++;
    }

    // Apply sorting
    const sortBy = pagination?.sortBy || 'created_at';
    const sortOrder = pagination?.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Apply pagination
    if (pagination?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(pagination.limit);
      paramIndex++;
    }

    if (pagination?.cursor) {
      // Cursor-based pagination implementation would go here
      // For now, using simple offset
      if (pagination?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(pagination.offset);
      }
    }

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map((row) => this.mapRowToCreditEntry(row));
    } catch (error) {
      logger.error('Error finding all credit entries', {
        error,
        filters,
        pagination,
      });
      throw error;
    }
  }

  async count(filters?: any): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM credit_entries WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.ownerId) {
      query += ` AND owner_id = $${paramIndex}`;
      params.push(filters.ownerId);
      paramIndex++;
    }

    if (filters?.projectId) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.projectId);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.vintage) {
      query += ` AND vintage = $${paramIndex}`;
      params.push(filters.vintage);
      paramIndex++;
    }

    try {
      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting credit entries', { error, filters });
      throw error;
    }
  }

  private mapRowToCreditEntry(row: any): CreditEntry {
    return {
      id: row.id,
      creditId: row.credit_id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      quantity: parseFloat(row.quantity),
      vintage: row.vintage,
      status: row.status as CreditStatus,
      issuedAt: new Date(row.issued_at),
      lastActionAt: new Date(row.last_action_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
