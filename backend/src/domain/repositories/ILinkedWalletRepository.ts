import { LinkedWallet } from '../entities/LinkedWallet';

/**
 * ILinkedWalletRepository Interface
 *
 * Repository interface for linked wallet operations.
 * This is a Web2 interface - it defines database operations,
 * not blockchain interactions.
 * 
 * Requirements: 2.3, 2.4, 2.8, 2.9
 */

export interface ILinkedWalletRepository {
    findById(id: string): Promise<LinkedWallet | null>;
    findByUserId(userId: string): Promise<LinkedWallet | null>;
    findByAddress(address: string): Promise<LinkedWallet | null>;
    save(wallet: LinkedWallet): Promise<LinkedWallet>;
    update(wallet: LinkedWallet): Promise<LinkedWallet>;
    delete(id: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
}


