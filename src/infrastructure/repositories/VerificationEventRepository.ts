import { Pool } from 'pg';
import { VerificationEvent } from '../../domain/entities/VerificationEvent';
import { IVerificationEventRepository } from '../../domain/repositories/IVerificationEventRepository';
import { database } from '../../config/database';

export class VerificationEventRepository implements IVerificationEventRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async findByVerificationId(verificationId: string): Promise<VerificationEvent[]> {
    const query = `
      SELECT 
        id, verification_id as "verificationId", event_type as "eventType",
        message, user_id as "userId", metadata, created_at as "createdAt"
      FROM verification_events
      WHERE verification_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [verificationId]);
    return result.rows.map((row) => this.mapRowToVerificationEvent(row));
  }

  async save(event: VerificationEvent): Promise<VerificationEvent> {
    const query = `
      INSERT INTO verification_events (
        id, verification_id, event_type, message, user_id, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, verification_id as "verificationId", event_type as "eventType",
        message, user_id as "userId", metadata, created_at as "createdAt"
    `;

    const values = [
      event.id,
      event.verificationId,
      event.eventType,
      event.message,
      event.userId,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.createdAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToVerificationEvent(result.rows[0]);
  }

  private mapRowToVerificationEvent(row: any): VerificationEvent {
    return {
      id: row.id,
      verificationId: row.verificationId,
      eventType: row.eventType,
      message: row.message,
      userId: row.userId,
      metadata: row.metadata || null,
      createdAt: new Date(row.createdAt),
    };
  }
}
