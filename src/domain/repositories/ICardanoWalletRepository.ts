import { CardanoWallet } from '../entities/CardanoWallet';

/**
 * ICardanoWalletRepository Interface
 *
 * Repository interface for Cardano wallet operations.
 * Requirements: 2.3, 2.4, 2.8, 2.9
 */

export interface ICardanoWalletRepository {
  findById(id: string): Promise<CardanoWallet | null>;
  findByUserId(userId: string): Promise<CardanoWallet | null>;
  findByAddress(address: string): Promise<CardanoWallet | null>;
  save(wallet: CardanoWallet): Promise<CardanoWallet>;
  update(wallet: CardanoWallet): Promise<CardanoWallet>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
