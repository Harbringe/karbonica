/**
 * Vault Service Interface and Implementations
 *
 * Provides secure storage and retrieval of sensitive data like private keys.
 * Supports multiple vault providers: AWS KMS, Azure Key Vault, HashiCorp Vault.
 *
 * Requirements: 15.2, 15.18
 */

export interface VaultConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'hashicorp-vault' | 'local-dev';
  region?: string;
  keyId?: string;
  vaultUrl?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    token?: string;
  };
}

export interface VaultService {
  /**
   * Store a secret in the vault
   * @param key Secret identifier
   * @param value Secret value to store
   * @returns Promise<void>
   */
  storeSecret(key: string, value: string): Promise<void>;

  /**
   * Retrieve a secret from the vault
   * @param key Secret identifier
   * @returns Promise<string> The secret value
   */
  getSecret(key: string): Promise<string>;

  /**
   * Check if a secret exists in the vault
   * @param key Secret identifier
   * @returns Promise<boolean>
   */
  hasSecret(key: string): Promise<boolean>;

  /**
   * Delete a secret from the vault
   * @param key Secret identifier
   * @returns Promise<void>
   */
  deleteSecret(key: string): Promise<void>;

  /**
   * Encrypt data using the vault's encryption capabilities
   * @param data Data to encrypt
   * @returns Promise<string> Encrypted data
   */
  encrypt(data: string): Promise<string>;

  /**
   * Decrypt data using the vault's decryption capabilities
   * @param encryptedData Encrypted data to decrypt
   * @returns Promise<string> Decrypted data
   */
  decrypt(encryptedData: string): Promise<string>;
}

/**
 * Local Development Vault Service
 *
 * WARNING: This is for development only and stores secrets in memory.
 * DO NOT use in production environments.
 */
export class LocalDevVaultService implements VaultService {
  private secrets: Map<string, string> = new Map();

  async storeSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  async getSecret(key: string): Promise<string> {
    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret not found: ${key}`);
    }
    return secret;
  }

  async hasSecret(key: string): Promise<boolean> {
    return this.secrets.has(key);
  }

  async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }

  async encrypt(data: string): Promise<string> {
    // Simple base64 encoding for development (NOT secure)
    return Buffer.from(data).toString('base64');
  }

  async decrypt(encryptedData: string): Promise<string> {
    // Simple base64 decoding for development (NOT secure)
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }
}

/**
 * Vault Service Factory
 *
 * Creates the appropriate vault service based on configuration
 */
export class VaultServiceFactory {
  static create(config: VaultConfig): VaultService {
    switch (config.provider) {
      case 'local-dev':
        return new LocalDevVaultService();
      case 'aws-kms':
        // TODO: Implement AWS KMS service
        throw new Error('AWS KMS vault service not yet implemented');
      case 'azure-keyvault':
        // TODO: Implement Azure Key Vault service
        throw new Error('Azure Key Vault service not yet implemented');
      case 'hashicorp-vault':
        // TODO: Implement HashiCorp Vault service
        throw new Error('HashiCorp Vault service not yet implemented');
      default:
        throw new Error(`Unsupported vault provider: ${config.provider}`);
    }
  }
}

/**
 * Vault Service Error Classes
 */
export class VaultError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

export class VaultSecretNotFoundError extends VaultError {
  constructor(key: string) {
    super(`Secret not found: ${key}`);
    this.name = 'VaultSecretNotFoundError';
  }
}

export class VaultAuthenticationError extends VaultError {
  constructor(message: string) {
    super(`Vault authentication failed: ${message}`);
    this.name = 'VaultAuthenticationError';
  }
}

export class VaultConnectionError extends VaultError {
  constructor(message: string) {
    super(`Vault connection failed: ${message}`);
    this.name = 'VaultConnectionError';
  }
}
