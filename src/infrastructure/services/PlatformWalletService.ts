/**
 * Platform Wallet Service
 *
 * Manages the platform's Cardano wallet for signing transactions.
 * Securely stores and retrieves the wallet private key from a vault.
 * Provides utilities to check wallet balance and manage wallet operations.
 *
 * Requirements: 15.2, 15.18
 */

import { VaultService, VaultError } from './VaultService';
import { initializeBlockfrostClient, getCardanoConfig } from '../../config/cardano';
import { logger } from '../../utils/logger';

export interface PlatformWalletConfig {
  walletName: string;
  vaultKeyPrefix: string;
  minBalanceThreshold: number; // Minimum ADA balance in lovelace
  alertThreshold: number; // Balance threshold for alerts in lovelace
}

export interface WalletBalance {
  ada: string; // ADA amount as string
  lovelace: string; // Lovelace amount as string
  assets: Array<{
    unit: string;
    quantity: string;
  }>;
}

export interface WalletInfo {
  address: string;
  stakeAddress?: string;
  balance: WalletBalance;
  utxos: number;
}

/**
 * Platform Wallet Service
 *
 * Manages the platform's Cardano wallet operations
 */
export class PlatformWalletService {
  private readonly vaultService: VaultService;
  private readonly config: PlatformWalletConfig;
  private readonly blockfrost;
  private cachedAddress?: string;
  private cachedPublicKey?: string;

  constructor(vaultService: VaultService, config: PlatformWalletConfig) {
    this.vaultService = vaultService;
    this.config = config;
    this.blockfrost = initializeBlockfrostClient();
  }

  /**
   * Initialize platform wallet
   *
   * Creates a new wallet if it doesn't exist, or loads existing wallet
   */
  async initialize(): Promise<void> {
    try {
      const hasWallet = await this.hasWallet();

      if (!hasWallet) {
        logger.info('Platform wallet not found, creating new wallet');
        await this.createWallet();
      } else {
        logger.info('Platform wallet found, loading wallet info');
        await this.loadWalletInfo();
      }

      // Check initial balance
      const balance = await this.getBalance();
      logger.info('Platform wallet initialized', {
        address: this.cachedAddress,
        balance: balance.ada,
        lovelace: balance.lovelace,
      });

      // Check if balance is below threshold
      await this.checkBalanceThreshold();
    } catch (error) {
      logger.error('Failed to initialize platform wallet', { error });
      throw new PlatformWalletError('Failed to initialize platform wallet', error as Error);
    }
  }

  /**
   * Check if platform wallet exists in vault
   */
  async hasWallet(): Promise<boolean> {
    try {
      const privateKeyExists = await this.vaultService.hasSecret(this.getPrivateKeyVaultKey());
      const publicKeyExists = await this.vaultService.hasSecret(this.getPublicKeyVaultKey());
      const addressExists = await this.vaultService.hasSecret(this.getAddressVaultKey());

      return privateKeyExists && publicKeyExists && addressExists;
    } catch (error) {
      logger.error('Error checking wallet existence', { error });
      return false;
    }
  }

  /**
   * Create a new platform wallet
   *
   * Generates new Cardano wallet keys and stores them securely in vault
   */
  async createWallet(): Promise<void> {
    try {
      // Import Cardano serialization library
      const CardanoWasm = await import('@emurgo/cardano-serialization-lib-nodejs');

      // Generate new private key
      const privateKey = CardanoWasm.PrivateKey.generate_ed25519();
      const publicKey = privateKey.to_public();

      // Generate address for the current network
      const cardanoConfig = getCardanoConfig();
      const networkId = cardanoConfig.network === 'mainnet' ? 1 : 0;

      const baseAddress = CardanoWasm.BaseAddress.new(
        networkId,
        CardanoWasm.StakeCredential.from_keyhash(publicKey.hash()),
        CardanoWasm.StakeCredential.from_keyhash(publicKey.hash()) // Using same key for stake
      );

      const address = baseAddress.to_address().to_bech32();

      // Store keys and address in vault
      await this.vaultService.storeSecret(this.getPrivateKeyVaultKey(), privateKey.to_bech32());

      await this.vaultService.storeSecret(this.getPublicKeyVaultKey(), publicKey.to_bech32());

      await this.vaultService.storeSecret(this.getAddressVaultKey(), address);

      // Cache the values
      this.cachedAddress = address;
      this.cachedPublicKey = publicKey.to_bech32();

      logger.info('Platform wallet created successfully', {
        address,
        network: cardanoConfig.network,
      });
    } catch (error) {
      logger.error('Failed to create platform wallet', { error });
      throw new PlatformWalletError('Failed to create platform wallet', error as Error);
    }
  }

  /**
   * Load wallet information from vault
   */
  async loadWalletInfo(): Promise<void> {
    try {
      this.cachedAddress = await this.vaultService.getSecret(this.getAddressVaultKey());
      this.cachedPublicKey = await this.vaultService.getSecret(this.getPublicKeyVaultKey());
    } catch (error) {
      logger.error('Failed to load wallet info', { error });
      throw new PlatformWalletError('Failed to load wallet info', error as Error);
    }
  }

  /**
   * Get platform wallet address
   */
  async getAddress(): Promise<string> {
    if (!this.cachedAddress) {
      await this.loadWalletInfo();
    }

    if (!this.cachedAddress) {
      throw new PlatformWalletError('Platform wallet address not available');
    }

    return this.cachedAddress;
  }

  /**
   * Get platform wallet private key (for signing transactions)
   */
  async getPrivateKey(): Promise<string> {
    try {
      return await this.vaultService.getSecret(this.getPrivateKeyVaultKey());
    } catch (error) {
      logger.error('Failed to retrieve private key', { error });
      throw new PlatformWalletError('Failed to retrieve private key', error as Error);
    }
  }

  /**
   * Get platform wallet public key
   */
  async getPublicKey(): Promise<string> {
    if (!this.cachedPublicKey) {
      await this.loadWalletInfo();
    }

    if (!this.cachedPublicKey) {
      throw new PlatformWalletError('Platform wallet public key not available');
    }

    return this.cachedPublicKey;
  }

  /**
   * Get platform wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    try {
      const address = await this.getAddress();
      const addressDetails = await this.blockfrost.addresses(address);

      // Convert lovelace to ADA
      const lovelaceAmount =
        addressDetails.amount.find((a) => a.unit === 'lovelace')?.quantity || '0';
      const adaAmount = (parseInt(lovelaceAmount) / 1_000_000).toString();

      // Get other assets
      const assets = addressDetails.amount.filter((a) => a.unit !== 'lovelace');

      return {
        ada: adaAmount,
        lovelace: lovelaceAmount,
        assets,
      };
    } catch (error) {
      logger.error('Failed to get wallet balance', { error });
      throw new PlatformWalletError('Failed to get wallet balance', error as Error);
    }
  }

  /**
   * Get detailed wallet information
   */
  async getWalletInfo(): Promise<WalletInfo> {
    try {
      const address = await this.getAddress();
      const balance = await this.getBalance();

      // Get UTxOs count
      const utxos = await this.blockfrost.addressesUtxos(address);

      return {
        address,
        balance,
        utxos: utxos.length,
      };
    } catch (error) {
      logger.error('Failed to get wallet info', { error });
      throw new PlatformWalletError('Failed to get wallet info', error as Error);
    }
  }

  /**
   * Check if wallet balance is below threshold and alert if necessary
   */
  async checkBalanceThreshold(): Promise<void> {
    try {
      const balance = await this.getBalance();
      const lovelaceBalance = parseInt(balance.lovelace);

      if (lovelaceBalance < this.config.minBalanceThreshold) {
        const message = `Platform wallet balance critically low: ${balance.ada} ADA`;
        logger.error(message, {
          balance: balance.ada,
          threshold: (this.config.minBalanceThreshold / 1_000_000).toString(),
          address: this.cachedAddress,
        });

        // TODO: Integrate with alerting system (PagerDuty, Slack, etc.)
        throw new PlatformWalletLowBalanceError(
          message,
          lovelaceBalance,
          this.config.minBalanceThreshold
        );
      }

      if (lovelaceBalance < this.config.alertThreshold) {
        const message = `Platform wallet balance low: ${balance.ada} ADA`;
        logger.warn(message, {
          balance: balance.ada,
          threshold: (this.config.alertThreshold / 1_000_000).toString(),
          address: this.cachedAddress,
        });

        // TODO: Send warning notification
      }
    } catch (error) {
      if (error instanceof PlatformWalletLowBalanceError) {
        throw error;
      }

      logger.error('Failed to check balance threshold', { error });
      throw new PlatformWalletError('Failed to check balance threshold', error as Error);
    }
  }

  /**
   * Get UTxOs for the platform wallet
   */
  async getUtxos(): Promise<any[]> {
    try {
      const address = await this.getAddress();
      return await this.blockfrost.addressesUtxos(address);
    } catch (error) {
      logger.error('Failed to get wallet UTxOs', { error });
      throw new PlatformWalletError('Failed to get wallet UTxOs', error as Error);
    }
  }

  /**
   * Rotate wallet keys (for security)
   *
   * WARNING: This will create a new wallet. Ensure all funds are transferred first.
   */
  async rotateKeys(): Promise<void> {
    try {
      logger.info('Starting wallet key rotation');

      // Check current balance
      const currentBalance = await this.getBalance();
      if (parseInt(currentBalance.lovelace) > 0) {
        throw new PlatformWalletError(
          'Cannot rotate keys while wallet has balance. Transfer funds first.'
        );
      }

      // Delete old keys
      await this.vaultService.deleteSecret(this.getPrivateKeyVaultKey());
      await this.vaultService.deleteSecret(this.getPublicKeyVaultKey());
      await this.vaultService.deleteSecret(this.getAddressVaultKey());

      // Clear cache
      this.cachedAddress = undefined;
      this.cachedPublicKey = undefined;

      // Create new wallet
      await this.createWallet();

      logger.info('Wallet key rotation completed successfully');
    } catch (error) {
      logger.error('Failed to rotate wallet keys', { error });
      throw new PlatformWalletError('Failed to rotate wallet keys', error as Error);
    }
  }

  /**
   * Get vault key for private key storage
   */
  private getPrivateKeyVaultKey(): string {
    return `${this.config.vaultKeyPrefix}/private-key`;
  }

  /**
   * Get vault key for public key storage
   */
  private getPublicKeyVaultKey(): string {
    return `${this.config.vaultKeyPrefix}/public-key`;
  }

  /**
   * Get vault key for address storage
   */
  private getAddressVaultKey(): string {
    return `${this.config.vaultKeyPrefix}/address`;
  }
}

/**
 * Platform Wallet Error Classes
 */
export class PlatformWalletError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PlatformWalletError';
  }
}

export class PlatformWalletLowBalanceError extends PlatformWalletError {
  constructor(
    message: string,
    public readonly currentBalance: number,
    public readonly threshold: number
  ) {
    super(message);
    this.name = 'PlatformWalletLowBalanceError';
  }
}

export class PlatformWalletNotFoundError extends PlatformWalletError {
  constructor() {
    super('Platform wallet not found. Initialize wallet first.');
    this.name = 'PlatformWalletNotFoundError';
  }
}
