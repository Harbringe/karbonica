import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { config } from './index';

/**
 * Cardano Configuration Module
 *
 * This module provides configuration and initialization for Cardano blockchain integration.
 * It supports connection to Cardano Preview testnet via Blockfrost API.
 *
 * Requirements: 15.1, 15.6
 */

export interface CardanoConfig {
  network: 'preview' | 'preprod' | 'mainnet';
  blockfrostApiKey: string;
  blockfrostUrl: string;
  confirmationsRequired: number;
  transactionTimeout: number;
  pollingInterval: number;
  maxRetries: number;
  retryBackoffMs: number;
}

/**
 * Get Cardano configuration from environment
 */
export function getCardanoConfig(): CardanoConfig {
  const { cardano } = config;

  if (!cardano.blockfrostApiKey) {
    throw new Error('BLOCKFROST_API_KEY is required for Cardano integration');
  }

  if (!cardano.blockfrostUrl) {
    throw new Error('BLOCKFROST_URL is required for Cardano integration');
  }

  return {
    network: cardano.network,
    blockfrostApiKey: cardano.blockfrostApiKey,
    blockfrostUrl: cardano.blockfrostUrl,
    confirmationsRequired: 6, // ~2 minutes on Cardano
    transactionTimeout: 600000, // 10 minutes in milliseconds
    pollingInterval: 20000, // 20 seconds in milliseconds
    maxRetries: 3,
    retryBackoffMs: 1000, // Start with 1 second, exponential backoff
  };
}

/**
 * Initialize Blockfrost API client
 *
 * @returns Configured BlockFrostAPI instance
 */
export function initializeBlockfrostClient(): BlockFrostAPI {
  const cardanoConfig = getCardanoConfig();

  return new BlockFrostAPI({
    projectId: cardanoConfig.blockfrostApiKey,
    customBackend: cardanoConfig.blockfrostUrl,
  });
}

/**
 * Validate Cardano configuration
 *
 * @throws Error if configuration is invalid
 */
export function validateCardanoConfig(): void {
  const cardanoConfig = getCardanoConfig();

  // Validate network
  const validNetworks = ['preview', 'preprod', 'mainnet'];
  if (!validNetworks.includes(cardanoConfig.network)) {
    throw new Error(`Invalid Cardano network: ${cardanoConfig.network}`);
  }

  // Validate Blockfrost URL matches network
  const urlNetworkMap: Record<string, string> = {
    preview: 'cardano-preview.blockfrost.io',
    preprod: 'cardano-preprod.blockfrost.io',
    mainnet: 'cardano-mainnet.blockfrost.io',
  };

  const expectedHost = urlNetworkMap[cardanoConfig.network];
  if (!cardanoConfig.blockfrostUrl.includes(expectedHost)) {
    throw new Error(
      `Blockfrost URL does not match network. Expected ${expectedHost} for ${cardanoConfig.network} network`
    );
  }

  // Validate API key format (Blockfrost keys start with network prefix)
  const apiKeyPrefix = cardanoConfig.network;
  if (!cardanoConfig.blockfrostApiKey.startsWith(apiKeyPrefix)) {
    console.warn(
      `Warning: Blockfrost API key does not start with expected prefix '${apiKeyPrefix}'. This may cause authentication issues.`
    );
  }
}

/**
 * Get Cardano network explorer URL
 *
 * @param txHash Transaction hash
 * @returns Explorer URL for the transaction
 */
export function getExplorerUrl(txHash: string): string {
  const cardanoConfig = getCardanoConfig();

  const explorerUrls: Record<string, string> = {
    preview: 'https://preview.cardanoscan.io',
    preprod: 'https://preprod.cardanoscan.io',
    mainnet: 'https://cardanoscan.io',
  };

  const baseUrl = explorerUrls[cardanoConfig.network];
  return `${baseUrl}/transaction/${txHash}`;
}

/**
 * Cardano network information
 */
export const CARDANO_NETWORKS = {
  preview: {
    name: 'Preview Testnet',
    networkId: 0,
    protocolMagic: 2,
    blockTime: 20, // seconds
    epochLength: 86400, // slots
  },
  preprod: {
    name: 'Pre-Production Testnet',
    networkId: 0,
    protocolMagic: 1,
    blockTime: 20, // seconds
    epochLength: 432000, // slots
  },
  mainnet: {
    name: 'Mainnet',
    networkId: 1,
    protocolMagic: 764824073,
    blockTime: 20, // seconds
    epochLength: 432000, // slots
  },
} as const;

/**
 * Get current network information
 */
export function getNetworkInfo() {
  const cardanoConfig = getCardanoConfig();
  return CARDANO_NETWORKS[cardanoConfig.network];
}
