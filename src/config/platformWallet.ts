/**
 * Platform Wallet Configuration Module
 *
 * Provides configuration and initialization for the platform's Cardano wallet.
 * Integrates with vault services for secure key management.
 *
 * Requirements: 15.2, 15.18
 */

import { config } from './index';
import {
  VaultService,
  VaultServiceFactory,
  VaultConfig,
} from '../infrastructure/services/VaultService';
import {
  PlatformWalletService,
  PlatformWalletConfig,
} from '../infrastructure/services/PlatformWalletService';
import { logger } from '../utils/logger';

let vaultService: VaultService | null = null;
let platformWalletService: PlatformWalletService | null = null;

/**
 * Initialize vault service
 */
export function initializeVaultService(): VaultService {
  if (vaultService) {
    return vaultService;
  }

  const vaultConfig: VaultConfig = {
    provider: config.vault.provider,
    region: config.vault.region,
    keyId: config.vault.keyId,
    vaultUrl: config.vault.vaultUrl,
    credentials: config.vault.credentials,
  };

  vaultService = VaultServiceFactory.create(vaultConfig);

  logger.info('Vault service initialized', {
    provider: vaultConfig.provider,
    region: vaultConfig.region,
  });

  return vaultService;
}

/**
 * Initialize platform wallet service
 */
export function initializePlatformWalletService(): PlatformWalletService {
  if (platformWalletService) {
    return platformWalletService;
  }

  const vault = initializeVaultService();

  const walletConfig: PlatformWalletConfig = {
    walletName: config.platformWallet.walletName,
    vaultKeyPrefix: config.platformWallet.vaultKeyPrefix,
    minBalanceThreshold: config.platformWallet.minBalanceThreshold,
    alertThreshold: config.platformWallet.alertThreshold,
  };

  platformWalletService = new PlatformWalletService(vault, walletConfig);

  logger.info('Platform wallet service initialized', {
    walletName: walletConfig.walletName,
    minBalanceThreshold: (walletConfig.minBalanceThreshold / 1_000_000).toString() + ' ADA',
    alertThreshold: (walletConfig.alertThreshold / 1_000_000).toString() + ' ADA',
  });

  return platformWalletService;
}

/**
 * Get vault service instance
 */
export function getVaultService(): VaultService {
  if (!vaultService) {
    throw new Error('Vault service not initialized. Call initializeVaultService() first.');
  }
  return vaultService;
}

/**
 * Get platform wallet service instance
 */
export function getPlatformWalletService(): PlatformWalletService {
  if (!platformWalletService) {
    throw new Error(
      'Platform wallet service not initialized. Call initializePlatformWalletService() first.'
    );
  }
  return platformWalletService;
}

/**
 * Initialize platform wallet (create or load)
 */
export async function initializePlatformWallet(): Promise<void> {
  try {
    const walletService = initializePlatformWalletService();
    await walletService.initialize();

    logger.info('Platform wallet initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize platform wallet', { error });
    throw error;
  }
}

/**
 * Check platform wallet health
 */
export async function checkPlatformWalletHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  address: string;
  balance: string;
  message?: string;
}> {
  try {
    const walletService = getPlatformWalletService();
    const walletInfo = await walletService.getWalletInfo();

    const balanceLovelace = parseInt(walletInfo.balance.lovelace);
    const minThreshold = config.platformWallet.minBalanceThreshold;
    const alertThreshold = config.platformWallet.alertThreshold;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message: string | undefined;

    if (balanceLovelace < minThreshold) {
      status = 'critical';
      message = `Balance critically low: ${walletInfo.balance.ada} ADA`;
    } else if (balanceLovelace < alertThreshold) {
      status = 'warning';
      message = `Balance low: ${walletInfo.balance.ada} ADA`;
    }

    return {
      status,
      address: walletInfo.address,
      balance: walletInfo.balance.ada,
      message,
    };
  } catch (error) {
    logger.error('Failed to check platform wallet health', { error });
    return {
      status: 'critical',
      address: 'unknown',
      balance: '0',
      message: 'Failed to check wallet health',
    };
  }
}

/**
 * Validate platform wallet configuration
 */
export function validatePlatformWalletConfig(): void {
  const { vault, platformWallet } = config;

  // Validate vault provider
  const validProviders = ['local-dev', 'file-dev', 'aws-kms', 'azure-keyvault', 'hashicorp-vault'];
  if (!validProviders.includes(vault.provider)) {
    throw new Error(`Invalid vault provider: ${vault.provider}`);
  }

  // Validate production vault provider
  if (config.env === 'production' && ['local-dev', 'file-dev'].includes(vault.provider)) {
    throw new Error('local-dev and file-dev vault providers cannot be used in production');
  }

  // Validate balance thresholds
  if (platformWallet.minBalanceThreshold >= platformWallet.alertThreshold) {
    throw new Error('Minimum balance threshold must be less than alert threshold');
  }

  if (platformWallet.minBalanceThreshold < 1_000_000) {
    // 1 ADA
    throw new Error('Minimum balance threshold must be at least 1 ADA');
  }

  // Validate provider-specific configuration
  switch (vault.provider) {
    case 'aws-kms':
      if (!vault.region) {
        throw new Error('AWS region is required for AWS KMS vault provider');
      }
      if (!vault.keyId) {
        throw new Error('Key ID is required for AWS KMS vault provider');
      }
      break;

    case 'azure-keyvault':
      if (!vault.vaultUrl) {
        throw new Error('Vault URL is required for Azure Key Vault provider');
      }
      if (
        !vault.credentials?.clientId ||
        !vault.credentials?.clientSecret ||
        !vault.credentials?.tenantId
      ) {
        throw new Error(
          'Client ID, Client Secret, and Tenant ID are required for Azure Key Vault provider'
        );
      }
      break;

    case 'hashicorp-vault':
      if (!vault.vaultUrl) {
        throw new Error('Vault URL is required for HashiCorp Vault provider');
      }
      if (!vault.credentials?.token) {
        throw new Error('Token is required for HashiCorp Vault provider');
      }
      break;
  }

  logger.info('Platform wallet configuration validated successfully');
}
