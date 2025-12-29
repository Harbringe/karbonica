import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string().default('karbonica_db'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),



  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Application
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Vault Configuration
  VAULT_PROVIDER: z
    .enum(['local-dev', 'file-dev', 'aws-kms', 'azure-keyvault', 'hashicorp-vault'])
    .default('file-dev'),
  VAULT_DIR: z.string().default('./.vault'),
  VAULT_REGION: z.string().optional(),
  VAULT_KEY_ID: z.string().optional(),
  VAULT_URL: z.string().url().optional(),
  VAULT_ACCESS_KEY_ID: z.string().optional(),
  VAULT_SECRET_ACCESS_KEY: z.string().optional(),
  VAULT_CLIENT_ID: z.string().optional(),
  VAULT_CLIENT_SECRET: z.string().optional(),
  VAULT_TENANT_ID: z.string().optional(),
  VAULT_TOKEN: z.string().optional(),

  // Platform Wallet Configuration
  PLATFORM_WALLET_NAME: z.string().default('karbonica-platform-wallet'),
  PLATFORM_WALLET_MIN_BALANCE: z.string().transform(Number).default('100000000'), // 100 ADA in lovelace
  PLATFORM_WALLET_ALERT_THRESHOLD: z.string().transform(Number).default('500000000'), // 500 ADA in lovelace
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  apiVersion: env.API_VERSION,

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
    },
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },



  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },

  app: {
    frontendUrl: env.FRONTEND_URL,
  },

  vault: {
    provider: env.VAULT_PROVIDER,
    region: env.VAULT_REGION,
    keyId: env.VAULT_KEY_ID,
    vaultUrl: env.VAULT_URL,
    vaultDir: env.VAULT_DIR,
    credentials: {
      accessKeyId: env.VAULT_ACCESS_KEY_ID,
      secretAccessKey: env.VAULT_SECRET_ACCESS_KEY,
      clientId: env.VAULT_CLIENT_ID,
      clientSecret: env.VAULT_CLIENT_SECRET,
      tenantId: env.VAULT_TENANT_ID,
      token: env.VAULT_TOKEN,
    },
  },

  platformWallet: {
    walletName: env.PLATFORM_WALLET_NAME,
    vaultKeyPrefix: `platform-wallet/${env.PLATFORM_WALLET_NAME}`,
    minBalanceThreshold: env.PLATFORM_WALLET_MIN_BALANCE,
    alertThreshold: env.PLATFORM_WALLET_ALERT_THRESHOLD,
  },
} as const;

export type Config = typeof config;
