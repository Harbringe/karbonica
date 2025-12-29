import { Pool } from 'pg';
import {
  ValidatorAssignment,
  CreateValidatorAssignmentData,
} from '../../domain/entities/ValidatorAssignment';
import { IValidatorAssignmentRepository } from '../../domain/repositories/IValidatorAssignmentRepository';
import { database } from '../../config/database';

export class ValidatorAssignmentRepository implements IValidatorAssignmentRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async save(data: CreateValidatorAssignmentData): Promise<ValidatorAssignment> {
    const query = `
      INSERT INTO validator_assignments (
        verification_id, validator_id, assigned_by, assigned_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (verification_id, validator_id) DO NOTHING
      RETURNING
        id, verification_id as "verificationId", validator_id as "validatorId",
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        created_at as "createdAt"
    `;

    const values = [data.verificationId, data.validatorId, data.assignedBy];

    const result = await this.pool.query(query, values);

    // If no rows returned due to conflict, fetch the existing assignment
    if (result.rows.length === 0) {
      return this.findByVerificationAndValidator(data.verificationId, data.validatorId) as Promise<ValidatorAssignment>;
    }

    return this.mapRowToValidatorAssignment(result.rows[0]);
  }

  async findByVerification(verificationId: string): Promise<ValidatorAssignment[]> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        created_at as "createdAt"
      FROM validator_assignments
      WHERE verification_id = $1
      ORDER BY assigned_at ASC
    `;

    const result = await this.pool.query(query, [verificationId]);
    return result.rows.map((row) => this.mapRowToValidatorAssignment(row));
  }

  async findByValidator(validatorId: string): Promise<ValidatorAssignment[]> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        created_at as "createdAt"
      FROM validator_assignments
      WHERE validator_id = $1
      ORDER BY assigned_at DESC
    `;

    const result = await this.pool.query(query, [validatorId]);
    return result.rows.map((row) => this.mapRowToValidatorAssignment(row));
  }

  async isValidatorAssigned(verificationId: string, validatorId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM validator_assignments
        WHERE verification_id = $1 AND validator_id = $2
      ) as exists
    `;

    const result = await this.pool.query(query, [verificationId, validatorId]);
    return result.rows[0].exists;
  }

  async findByVerificationAndValidator(
    verificationId: string,
    validatorId: string
  ): Promise<ValidatorAssignment | null> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        created_at as "createdAt"
      FROM validator_assignments
      WHERE verification_id = $1 AND validator_id = $2
    `;

    const result = await this.pool.query(query, [verificationId, validatorId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToValidatorAssignment(result.rows[0]);
  }

  async delete(verificationId: string, validatorId: string): Promise<void> {
    const query = `
      DELETE FROM validator_assignments
      WHERE verification_id = $1 AND validator_id = $2
    `;

    await this.pool.query(query, [verificationId, validatorId]);
  }

  async deleteAllForVerification(verificationId: string): Promise<void> {
    const query = `
      DELETE FROM validator_assignments
      WHERE verification_id = $1
    `;

    await this.pool.query(query, [verificationId]);
  }

  async countByVerification(verificationId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM validator_assignments
      WHERE verification_id = $1
    `;

    const result = await this.pool.query(query, [verificationId]);
    return parseInt(result.rows[0].count, 10);
  }

  private mapRowToValidatorAssignment(row: any): ValidatorAssignment {
    return {
      id: row.id,
      verificationId: row.verificationId,
      validatorId: row.validatorId,
      assignedBy: row.assignedBy,
      assignedAt: new Date(row.assignedAt),
      createdAt: new Date(row.createdAt),
    };
  }
}
