import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCardanoConfig,
  initializeBlockfrostClient,
  validateCardanoConfig,
  getExplorerUrl,
  getNetworkInfo,
  CARDANO_NETWORKS,
} from './cardano';

describe('Cardano Configuration', () => {
  describe('getCardanoConfig', () => {
    it('should return cardano configuration', () => {
      const config = getCardanoConfig();

      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('blockfrostApiKey');
      expect(config).toHaveProperty('blockfrostUrl');
      expect(config).toHaveProperty('confirmationsRequired');
      expect(config).toHaveProperty('transactionTimeout');
      expect(config).toHaveProperty('pollingInterval');
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('retryBackoffMs');
    });

    it('should have correct default values', () => {
      const config = getCardanoConfig();

      expect(config.confirmationsRequired).toBe(6);
      expect(config.transactionTimeout).toBe(600000); // 10 minutes
      expect(config.pollingInterval).toBe(20000); // 20 seconds
      expect(config.maxRetries).toBe(3);
      expect(config.retryBackoffMs).toBe(1000);
    });

    it('should use preview network by default', () => {
      const config = getCardanoConfig();
      expect(config.network).toBe('preview');
    });
  });

  describe('initializeBlockfrostClient', () => {
    it('should create a BlockFrostAPI instance', () => {
      const client = initializeBlockfrostClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty('accountsAddresses');
      expect(client).toHaveProperty('txs');
      expect(client).toHaveProperty('blocks');
    });
  });

  describe('validateCardanoConfig', () => {
    it('should not throw for valid configuration', () => {
      expect(() => validateCardanoConfig()).not.toThrow();
    });

    it('should validate network and URL match', () => {
      const config = getCardanoConfig();

      // For preview network, URL should contain 'cardano-preview.blockfrost.io'
      if (config.network === 'preview') {
        expect(config.blockfrostUrl).toContain('cardano-preview.blockfrost.io');
      }
    });
  });

  describe('getExplorerUrl', () => {
    it('should return correct explorer URL for preview network', () => {
      const txHash = 'abc123def456';
      const url = getExplorerUrl(txHash);

      expect(url).toBe(`https://preview.cardanoscan.io/transaction/${txHash}`);
    });

    it('should handle different transaction hash formats', () => {
      const txHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = getExplorerUrl(txHash);

      expect(url).toContain(txHash);
      expect(url).toContain('cardanoscan.io/transaction/');
    });
  });

  describe('getNetworkInfo', () => {
    it('should return network information', () => {
      const networkInfo = getNetworkInfo();

      expect(networkInfo).toHaveProperty('name');
      expect(networkInfo).toHaveProperty('networkId');
      expect(networkInfo).toHaveProperty('protocolMagic');
      expect(networkInfo).toHaveProperty('blockTime');
      expect(networkInfo).toHaveProperty('epochLength');
    });

    it('should return preview network info', () => {
      const networkInfo = getNetworkInfo();

      expect(networkInfo.name).toBe('Preview Testnet');
      expect(networkInfo.networkId).toBe(0);
      expect(networkInfo.protocolMagic).toBe(2);
      expect(networkInfo.blockTime).toBe(20);
    });
  });

  describe('CARDANO_NETWORKS', () => {
    it('should have all network configurations', () => {
      expect(CARDANO_NETWORKS).toHaveProperty('preview');
      expect(CARDANO_NETWORKS).toHaveProperty('preprod');
      expect(CARDANO_NETWORKS).toHaveProperty('mainnet');
    });

    it('should have correct mainnet configuration', () => {
      const mainnet = CARDANO_NETWORKS.mainnet;

      expect(mainnet.name).toBe('Mainnet');
      expect(mainnet.networkId).toBe(1);
      expect(mainnet.protocolMagic).toBe(764824073);
    });

    it('should have consistent block times across networks', () => {
      expect(CARDANO_NETWORKS.preview.blockTime).toBe(20);
      expect(CARDANO_NETWORKS.preprod.blockTime).toBe(20);
      expect(CARDANO_NETWORKS.mainnet.blockTime).toBe(20);
    });
  });
});
