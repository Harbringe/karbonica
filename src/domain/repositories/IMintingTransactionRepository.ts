import { Repository } from 'typeorm';
import { MintingTransaction } from '../entities/MintingTransaction';

export interface MintingTransactionRepository extends Repository<MintingTransaction> {
  findByProjectId(projectId: string): Promise<MintingTransaction[]>;
  findByPolicyId(policyId: string): Promise<MintingTransaction[]>;
  findByTxHash(txHash: string): Promise<MintingTransaction | null>;
}
