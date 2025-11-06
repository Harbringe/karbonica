/**
 * Vault Service Interface and Implementations
 *
 * Provides secure storage and retrieval of sensitive data like private keys.
 * Supports multiple vault providers: AWS KMS, Azure Key Vault, HashiCorp Vault.
 *
 * Requirements: 15.2, 15.18
 */

export interface VaultConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'hashicorp-vault' | 'local-dev' | 'file-dev';
  region?: string;
  keyId?: string;
  vaultUrl?: string;
  vaultDir?: string; // For file-dev provider
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
 * Local Development Vault Service (Memory-based)
 *
 * WARNING: This is for development only and stores secrets in memory.
 * Secrets are lost when the application restarts.
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
 * File-based Development Vault Service
 *
 * Stores secrets in encrypted files on disk for development.
 * Secrets persist across application restarts.
 * Still for development only - use proper vault services in production.
 */
export class FileDevVaultService implements VaultService {
  private readonly vaultDir: string;
  private readonly fs = require('fs');
  private readonly path = require('path');
  private readonly crypto = require('crypto');
  private readonly encryptionKey: string;

  constructor(vaultDir: string = './.vault') {
    this.vaultDir = vaultDir;

    // Create vault directory if it doesn't exist
    if (!this.fs.existsSync(this.vaultDir)) {
      this.fs.mkdirSync(this.vaultDir, { recursive: true });
    }

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  private getOrCreateEncryptionKey(): string {
    const keyPath = this.path.join(this.vaultDir, '.vault-key');

    if (this.fs.existsSync(keyPath)) {
      // Load existing key
      return this.fs.readFileSync(keyPath, 'utf8');
    } else {
      // Generate new key
      const key = this.crypto.randomBytes(32).toString('hex');
      this.fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Restrict file permissions
      return key;
    }
  }

  private getFilePath(key: string): string {
    // Replace path separators and special characters with underscores
    const safeKey = key.replace(/[/\\:*?"<>|]/g, '_');
    return this.path.join(this.vaultDir, `${safeKey}.enc`);
  }

  async storeSecret(key: string, value: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const encrypted = await this.encrypt(value);

      await this.fs.promises.writeFile(filePath, encrypted);
    } catch (error) {
      throw new VaultError(`Failed to store secret: ${key}`, error as Error);
    }
  }

  async getSecret(key: string): Promise<string> {
    try {
      const filePath = this.getFilePath(key);
      const encrypted = await this.fs.promises.readFile(filePath, 'utf8');
      return await this.decrypt(encrypted);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new VaultSecretNotFoundError(key);
      }
      throw new VaultError(`Failed to get secret: ${key}`, error as Error);
    }
  }

  async hasSecret(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await this.fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await this.fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw new VaultError(`Failed to delete secret: ${key}`, error as Error);
      }
      // File doesn't exist, that's fine
    }
  }

  async encrypt(data: string): Promise<string> {
    try {
      const iv = this.crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex').slice(0, 32); // Ensure 32 bytes for AES-256
      const cipher = this.crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new VaultError('Failed to encrypt data', error as Error);
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const key = Buffer.from(this.encryptionKey, 'hex').slice(0, 32); // Ensure 32 bytes for AES-256
      const decipher = this.crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new VaultError('Failed to decrypt data', error as Error);
    }
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
      case 'file-dev':
        return new FileDevVaultService(config.vaultDir);
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
