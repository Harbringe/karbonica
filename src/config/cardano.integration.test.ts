import { describe, it, expect } from 'vitest';
import { initializeBlockfrostClient, getCardanoConfig } from './cardano';

/**
 * Integration tests for Cardano Blockfrost API
 *
 * These tests make actual API calls to Blockfrost Preview testnet
 * and should only be run when BLOCKFROST_API_KEY is configured.
 */
describe('Cardano Blockfrost Integration', () => {
  const config = getCardanoConfig();
  const hasApiKey = config.blockfrostApiKey && config.blockfrostApiKey.length > 0;

  // Skip tests if no API key is configured
  const testIf = hasApiKey ? it : it.skip;

  testIf(
    'should connect to Blockfrost API and fetch latest block',
    async () => {
      const client = initializeBlockfrostClient();

      const latestBlock = await client.blocksLatest();

      expect(latestBlock).toBeDefined();
      expect(latestBlock).toHaveProperty('hash');
      expect(latestBlock).toHaveProperty('height');
      expect(latestBlock).toHaveProperty('time');
      expect(latestBlock.height).toBeGreaterThan(0);
    },
    10000
  ); // 10 second timeout for API call

  testIf(
    'should fetch network information',
    async () => {
      const client = initializeBlockfrostClient();

      const network = await client.network();

      expect(network).toBeDefined();
      expect(network).toHaveProperty('supply');
      expect(network).toHaveProperty('stake');
    },
    10000
  );

  testIf(
    'should fetch protocol parameters',
    async () => {
      const client = initializeBlockfrostClient();

      const params = await client.epochsLatestParameters();

      expect(params).toBeDefined();
      expect(params).toHaveProperty('min_fee_a');
      expect(params).toHaveProperty('min_fee_b');
      expect(params).toHaveProperty('max_tx_size');
      expect(params).toHaveProperty('coins_per_utxo_size');
    },
    10000
  );

  it('should handle missing API key gracefully', () => {
    if (!hasApiKey) {
      expect(() => getCardanoConfig()).toThrow('BLOCKFROST_API_KEY is required');
    }
  });
});
