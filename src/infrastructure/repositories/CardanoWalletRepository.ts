import { Pool } from 'pg';
import { database } from '../../config/database';
import { ICardanoWalletRepository } from '../../domain/repositories/ICardanoWalletRepository';
import { CardanoWallet } from '../../domain/entities/CardanoWallet';

/**
 * CardanoWalletRepository Implementation
 *
 * PostgreSQL implementation of the Cardano wallet repository.
 * Requirements: 2.3, 2.4, 2.8, 2.9
 */

export class CardanoWalletRepository implements ICardanoWalletRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async findById(id: string): Promise<CardanoWallet | null> {
    const query = `
      SELECT 
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
      FROM cardano_wallets
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWallet(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<CardanoWallet | null> {
    const query = `
      SELECT 
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
      FROM cardano_wallets
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWallet(result.rows[0]);
  }

  async findByAddress(address: string): Promise<CardanoWallet | null> {
    const query = `
      SELECT 
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
      FROM cardano_wallets
      WHERE address = $1
    `;

    const result = await this.pool.query(query, [address]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWallet(result.rows[0]);
  }

  async save(wallet: CardanoWallet): Promise<CardanoWallet> {
    const query = `
      INSERT INTO cardano_wallets (
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
    `;

    const values = [
      wallet.id,
      wallet.userId,
      wallet.address,
      wallet.stakeAddress,
      wallet.publicKey,
      wallet.linkedAt,
      wallet.lastVerifiedAt,
      wallet.isActive,
      wallet.createdAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToWallet(result.rows[0]);
  }

  async update(wallet: CardanoWallet): Promise<CardanoWallet> {
    const query = `
      UPDATE cardano_wallets
      SET 
        address = $2,
        stake_address = $3,
        public_key = $4,
        last_verified_at = $5,
        is_active = $6
      WHERE id = $1
      RETURNING 
        id, user_id, address, stake_address, public_key,
        linked_at, last_verified_at, is_active, created_at
    `;

    const values = [
      wallet.id,
      wallet.address,
      wallet.stakeAddress,
      wallet.publicKey,
      wallet.lastVerifiedAt,
      wallet.isActive,
    ];

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    return this.mapRowToWallet(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM cardano_wallets WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async deleteByUserId(userId: string): Promise<void> {
    const query = 'DELETE FROM cardano_wallets WHERE user_id = $1';
    await this.pool.query(query, [userId]);
  }

  private mapRowToWallet(row: any): CardanoWallet {
    return {
      id: row.id,
      userId: row.user_id,
      address: row.address,
      stakeAddress: row.stake_address,
      publicKey: row.public_key,
      linkedAt: row.linked_at,
      lastVerifiedAt: row.last_verified_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
