import { Pool } from 'pg';
import {
  ValidatorVote,
  CreateValidatorVoteData,
  UpdateValidatorVoteData,
  VerificationConsensusStatus,
  VoteDecision,
} from '../../domain/entities/ValidatorVote';
import { IValidatorVoteRepository } from '../../domain/repositories/IValidatorVoteRepository';
import { database } from '../../config/database';

export class ValidatorVoteRepository implements IValidatorVoteRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async save(data: CreateValidatorVoteData): Promise<ValidatorVote> {
    const query = `
      INSERT INTO validator_votes (
        verification_id, validator_id, vote, notes, voted_at,
        wallet_signature, wallet_address
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
      ON CONFLICT (verification_id, validator_id)
      DO UPDATE SET
        vote = EXCLUDED.vote,
        notes = EXCLUDED.notes,
        voted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        wallet_signature = EXCLUDED.wallet_signature,
        wallet_address = EXCLUDED.wallet_address
      RETURNING
        id, verification_id as "verificationId", validator_id as "validatorId",
        vote, notes, voted_at as "votedAt", created_at as "createdAt",
        updated_at as "updatedAt", wallet_signature as "walletSignature",
        wallet_address as "walletAddress"
    `;

    const values = [
      data.verificationId,
      data.validatorId,
      data.vote,
      data.notes || null,
      data.walletSignature,
      data.walletAddress,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToValidatorVote(result.rows[0]);
  }

  async update(
    verificationId: string,
    validatorId: string,
    data: UpdateValidatorVoteData
  ): Promise<ValidatorVote> {
    const query = `
      UPDATE validator_votes
      SET
        vote = $3,
        notes = $4,
        voted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        wallet_signature = $5,
        wallet_address = $6
      WHERE verification_id = $1 AND validator_id = $2
      RETURNING
        id, verification_id as "verificationId", validator_id as "validatorId",
        vote, notes, voted_at as "votedAt", created_at as "createdAt",
        updated_at as "updatedAt", wallet_signature as "walletSignature",
        wallet_address as "walletAddress"
    `;

    const values = [
      verificationId,
      validatorId,
      data.vote,
      data.notes || null,
      data.walletSignature,
      data.walletAddress,
    ];

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Vote not found');
    }

    return this.mapRowToValidatorVote(result.rows[0]);
  }

  async findByVerification(verificationId: string): Promise<ValidatorVote[]> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        vote, notes, voted_at as "votedAt", created_at as "createdAt",
        updated_at as "updatedAt", wallet_signature as "walletSignature",
        wallet_address as "walletAddress"
      FROM validator_votes
      WHERE verification_id = $1
      ORDER BY voted_at ASC
    `;

    const result = await this.pool.query(query, [verificationId]);
    return result.rows.map((row) => this.mapRowToValidatorVote(row));
  }

  async findByValidator(validatorId: string): Promise<ValidatorVote[]> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        vote, notes, voted_at as "votedAt", created_at as "createdAt",
        updated_at as "updatedAt", wallet_signature as "walletSignature",
        wallet_address as "walletAddress"
      FROM validator_votes
      WHERE validator_id = $1
      ORDER BY voted_at DESC
    `;

    const result = await this.pool.query(query, [validatorId]);
    return result.rows.map((row) => this.mapRowToValidatorVote(row));
  }

  async findByVerificationAndValidator(
    verificationId: string,
    validatorId: string
  ): Promise<ValidatorVote | null> {
    const query = `
      SELECT
        id, verification_id as "verificationId", validator_id as "validatorId",
        vote, notes, voted_at as "votedAt", created_at as "createdAt",
        updated_at as "updatedAt", wallet_signature as "walletSignature",
        wallet_address as "walletAddress"
      FROM validator_votes
      WHERE verification_id = $1 AND validator_id = $2
    `;

    const result = await this.pool.query(query, [verificationId, validatorId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToValidatorVote(result.rows[0]);
  }

  async delete(verificationId: string, validatorId: string): Promise<void> {
    const query = `
      DELETE FROM validator_votes
      WHERE verification_id = $1 AND validator_id = $2
    `;

    await this.pool.query(query, [verificationId, validatorId]);
  }

  async getConsensusStatus(verificationId: string): Promise<VerificationConsensusStatus> {
    // Get verification details
    const verificationQuery = `
      SELECT
        id, required_approvals, approval_count, rejection_count,
        vote_count, consensus_reached_at, status
      FROM verification_requests
      WHERE id = $1
    `;

    const verificationResult = await this.pool.query(verificationQuery, [verificationId]);

    if (verificationResult.rows.length === 0) {
      throw new Error('Verification not found');
    }

    const verification = verificationResult.rows[0];

    // Get total validators assigned
    const countQuery = `
      SELECT COUNT(*) as count
      FROM validator_assignments
      WHERE verification_id = $1
    `;

    const countResult = await this.pool.query(countQuery, [verificationId]);
    const totalValidators = parseInt(countResult.rows[0].count, 10);

    // Get all votes
    const votes = await this.findByVerification(verificationId);

    // Count votes by type
    const voteCounts = await this.countVotesByType(verificationId);

    // Determine consensus
    const consensusReached =
      verification.approval_count >= verification.required_approvals ||
      verification.rejection_count > (totalValidators - verification.required_approvals);

    let finalDecision: 'approved' | 'rejected' | 'pending' = 'pending';
    if (verification.approval_count >= verification.required_approvals) {
      finalDecision = 'approved';
    } else if (verification.rejection_count > (totalValidators - verification.required_approvals)) {
      finalDecision = 'rejected';
    }

    return {
      verificationId,
      totalValidators,
      requiredApprovals: verification.required_approvals,
      approvalCount: verification.approval_count,
      rejectionCount: verification.rejection_count,
      abstainCount: voteCounts.abstain,
      voteCount: verification.vote_count,
      consensusReached,
      finalDecision,
      votes,
    };
  }

  async countVotesByType(verificationId: string): Promise<{
    approve: number;
    reject: number;
    abstain: number;
    total: number;
  }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE vote = 'approve') as approve,
        COUNT(*) FILTER (WHERE vote = 'reject') as reject,
        COUNT(*) FILTER (WHERE vote = 'abstain') as abstain,
        COUNT(*) as total
      FROM validator_votes
      WHERE verification_id = $1
    `;

    const result = await this.pool.query(query, [verificationId]);
    const row = result.rows[0];

    return {
      approve: parseInt(row.approve, 10),
      reject: parseInt(row.reject, 10),
      abstain: parseInt(row.abstain, 10),
      total: parseInt(row.total, 10),
    };
  }

  private mapRowToValidatorVote(row: any): ValidatorVote {
    return {
      id: row.id,
      verificationId: row.verificationId,
      validatorId: row.validatorId,
      vote: row.vote as VoteDecision,
      notes: row.notes || null,
      votedAt: new Date(row.votedAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      txHash: row.txHash || null,
      walletSignature: row.walletSignature || null,
      walletAddress: row.walletAddress || null,
    };
  }
}
