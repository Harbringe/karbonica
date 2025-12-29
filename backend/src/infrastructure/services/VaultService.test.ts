/**
 * Vault Service Tests
 *
 * Tests for the vault service implementations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalDevVaultService,
  VaultServiceFactory,
  VaultConfig,
  VaultSecretNotFoundError,
} from './VaultService';

describe('LocalDevVaultService', () => {
  let vaultService: LocalDevVaultService;

  beforeEach(() => {
    vaultService = new LocalDevVaultService();
  });

  describe('Secret Management', () => {
    it('should store and retrieve secrets', async () => {
      const key = 'test-secret';
      const value = 'secret-value';

      await vaultService.storeSecret(key, value);
      const retrievedValue = await vaultService.getSecret(key);

      expect(retrievedValue).toBe(value);
    });

    it('should check if secret exists', async () => {
      const key = 'test-secret';
      const value = 'secret-value';

      expect(await vaultService.hasSecret(key)).toBe(false);

      await vaultService.storeSecret(key, value);
      expect(await vaultService.hasSecret(key)).toBe(true);
    });

    it('should delete secrets', async () => {
      const key = 'test-secret';
      const value = 'secret-value';

      await vaultService.storeSecret(key, value);
      expect(await vaultService.hasSecret(key)).toBe(true);

      await vaultService.deleteSecret(key);
      expect(await vaultService.hasSecret(key)).toBe(false);
    });

    it('should throw error when getting non-existent secret', async () => {
      await expect(vaultService.getSecret('non-existent')).rejects.toThrow(
        'Secret not found: non-existent'
      );
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data', async () => {
      const data = 'sensitive-data';

      const encrypted = await vaultService.encrypt(data);
      expect(encrypted).not.toBe(data);

      const decrypted = await vaultService.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });

    it('should handle empty data', async () => {
      const data = '';

      const encrypted = await vaultService.encrypt(data);
      const decrypted = await vaultService.decrypt(encrypted);

      expect(decrypted).toBe(data);
    });
  });
});

describe('VaultServiceFactory', () => {
  it('should create LocalDevVaultService for local-dev provider', () => {
    const config: VaultConfig = {
      provider: 'local-dev',
    };

    const service = VaultServiceFactory.create(config);
    expect(service).toBeInstanceOf(LocalDevVaultService);
  });

  it('should throw error for unsupported providers', () => {
    const config: VaultConfig = {
      provider: 'aws-kms',
    };

    expect(() => VaultServiceFactory.create(config)).toThrow(
      'AWS KMS vault service not yet implemented'
    );
  });

  it('should throw error for invalid provider', () => {
    const config = {
      provider: 'invalid-provider',
    } as VaultConfig;

    expect(() => VaultServiceFactory.create(config)).toThrow(
      'Unsupported vault provider: invalid-provider'
    );
  });
});
