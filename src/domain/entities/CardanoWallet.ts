/**
 * CardanoWallet Entity
 *
 * Represents a Cardano wallet linked to a user account.
 * Requirements: 2.3, 2.4, 2.8, 2.9, 15.10
 */

export interface CardanoWallet {
  id: string;
  userId: string;
  address: string;
  stakeAddress: string | null;
  publicKey: string;
  linkedAt: Date;
  lastVerifiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateCardanoWalletData {
  userId: string;
  address: string;
  stakeAddress?: string;
  publicKey: string;
}

export interface WalletChallenge {
  challengeId: string;
  message: string;
  expiresAt: Date;
}
