/**
 * Platform Wallet Service Tests
 *
 * Tests for the platform wallet service functionality.
 * Uses local development vault for testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalDevVaultService } from './VaultService';
import { PlatformWalletService, PlatformWalletConfig } from './PlatformWalletService';

// Mock the Cardano configuration
vi.mock('../../config/cardano', () => ({
  getCardanoConfig: () => ({
    network: 'preview',
    blockfrostApiKey: 'test-key',
    blockfrostUrl: 'https://cardano-preview.blockfrost.io/api/v0',
  }),
  initializeBlockfrostClient: () => ({
    addresses: vi.fn().mockResolvedValue({
      amount: [
        { unit: 'lovelace', quantity: '1000000000' }, // 1000 ADA
      ],
    }),
    addressesUtxos: vi.fn().mockResolvedValue([{ tx_hash: 'test-hash', output_index: 0 }]),
  }),
}));

// Mock the Cardano serialization library
vi.mock('@emurgo/cardano-serialization-lib-nodejs', () => ({
  PrivateKey: {
    generate_ed25519: () => ({
      to_public: () => ({
        hash: () => 'test-hash',
        to_bech32: () => 'test-public-key',
      }),
      to_bech32: () => 'test-private-key',
    }),
  },
  BaseAddress: {
    new: () => ({
      to_address: () => ({
        to_bech32: () => 'addr_test1test_address',
      }),
    }),
  },
  StakeCredential: {
    from_keyhash: () => 'test-stake-credential',
  },
}));

describe('PlatformWalletService', () => {
  let vaultService: LocalDevVaultService;
  let walletService: PlatformWalletService;
  let config: PlatformWalletConfig;

  beforeEach(() => {
    vaultService = new LocalDevVaultService();
    config = {
      walletName: 'test-wallet',
      vaultKeyPrefix: 'test-platform-wallet',
      minBalanceThreshold: 100_000_000, // 100 ADA
      alertThreshold: 500_000_000, // 500 ADA
    };
    walletService = new PlatformWalletService(vaultService, config);
  });

  describe('Wallet Creation', () => {
    it('should create a new wallet when none exists', async () => {
      const hasWallet = await walletService.hasWallet();
      expect(hasWallet).toBe(false);

      await walletService.initialize();

      const hasWalletAfter = await walletService.hasWallet();
      expect(hasWalletAfter).toBe(true);
    });

    it('should load existing wallet when it exists', async () => {
      // Create wallet first
      await walletService.initialize();
      const address1 = await walletService.getAddress();

      // Create new service instance (simulating app restart)
      const newWalletService = new PlatformWalletService(vaultService, config);
      await newWalletService.initialize();
      const address2 = await newWalletService.getAddress();

      expect(address1).toBe(address2);
    });
  });

  describe('Wallet Operations', () => {
    beforeEach(async () => {
      await walletService.initialize();
    });

    it('should get wallet address', async () => {
      const address = await walletService.getAddress();
      expect(address).toBe('addr_test1test_address');
    });

    it('should get wallet private key', async () => {
      const privateKey = await walletService.getPrivateKey();
      expect(privateKey).toBe('test-private-key');
    });

    it('should get wallet public key', async () => {
      const publicKey = await walletService.getPublicKey();
      expect(publicKey).toBe('test-public-key');
    });

    it('should get wallet balance', async () => {
      const balance = await walletService.getBalance();
      expect(balance.ada).toBe('1000');
      expect(balance.lovelace).toBe('1000000000');
      expect(balance.assets).toEqual([]);
    });

    it('should get wallet info', async () => {
      const walletInfo = await walletService.getWalletInfo();
      expect(walletInfo.address).toBe('addr_test1test_address');
      expect(walletInfo.balance.ada).toBe('1000');
      expect(walletInfo.utxos).toBe(1);
    });
  });

  describe('Balance Threshold Checking', () => {
    beforeEach(async () => {
      await walletService.initialize();
    });

    it('should not throw error when balance is above threshold', async () => {
      // Mock balance of 1000 ADA (above both thresholds)
      await expect(walletService.checkBalanceThreshold()).resolves.not.toThrow();
    });

    it('should throw error when balance is below minimum threshold', async () => {
      // Mock low balance
      const mockBlockfrost = {
        addresses: vi.fn().mockResolvedValue({
          amount: [
            { unit: 'lovelace', quantity: '50000000' }, // 50 ADA (below min threshold)
          ],
        }),
        addressesUtxos: vi.fn().mockResolvedValue([]),
      };

      // Replace the blockfrost client
      (walletService as any).blockfrost = mockBlockfrost;

      await expect(walletService.checkBalanceThreshold()).rejects.toThrow(
        'Platform wallet balance critically low'
      );
    });
  });

  describe('Vault Key Management', () => {
    it('should use correct vault keys', async () => {
      await walletService.initialize();

      const hasPrivateKey = await vaultService.hasSecret('test-platform-wallet/private-key');
      const hasPublicKey = await vaultService.hasSecret('test-platform-wallet/public-key');
      const hasAddress = await vaultService.hasSecret('test-platform-wallet/address');

      expect(hasPrivateKey).toBe(true);
      expect(hasPublicKey).toBe(true);
      expect(hasAddress).toBe(true);
    });
  });
});
