/**
 * LinkedWallet Entity
 *
 * Represents a wallet address linked to a user account for identification purposes.
 */

export interface LinkedWallet {
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

export interface CreateLinkedWalletData {
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
