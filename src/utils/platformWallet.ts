/**
 * Platform Wallet Utilities
 *
 * Utility functions for interacting with the platform wallet.
 * Provides convenient access to wallet operations throughout the application.
 *
 * Requirements: 15.2, 15.18
 */

import { getPlatformWalletService } from '../config/platformWallet';
import { logger } from './logger';

/**
 * Get platform wallet balance
 *
 * @returns Promise<{ ada: string; lovelace: string }> Wallet balance
 */
export async function getPlatformWalletBalance(): Promise<{
  ada: string;
  lovelace: string;
}> {
  try {
    const walletService = getPlatformWalletService();
    const balance = await walletService.getBalance();

    return {
      ada: balance.ada,
      lovelace: balance.lovelace,
    };
  } catch (error) {
    logger.error('Failed to get platform wallet balance', { error });
    throw error;
  }
}

/**
 * Get platform wallet address
 *
 * @returns Promise<string> Wallet address
 */
export async function getPlatformWalletAddress(): Promise<string> {
  try {
    const walletService = getPlatformWalletService();
    return await walletService.getAddress();
  } catch (error) {
    logger.error('Failed to get platform wallet address', { error });
    throw error;
  }
}

/**
 * Check if platform wallet has sufficient balance for transaction
 *
 * @param requiredLovelace Required balance in lovelace
 * @returns Promise<boolean> True if wallet has sufficient balance
 */
export async function hasSufficientBalance(requiredLovelace: number): Promise<boolean> {
  try {
    const balance = await getPlatformWalletBalance();
    const currentLovelace = parseInt(balance.lovelace);

    return currentLovelace >= requiredLovelace;
  } catch (error) {
    logger.error('Failed to check wallet balance', { error });
    return false;
  }
}

/**
 * Get platform wallet UTxOs
 *
 * @returns Promise<any[]> Array of UTxOs
 */
export async function getPlatformWalletUtxos(): Promise<any[]> {
  try {
    const walletService = getPlatformWalletService();
    return await walletService.getUtxos();
  } catch (error) {
    logger.error('Failed to get platform wallet UTxOs', { error });
    throw error;
  }
}

/**
 * Get platform wallet private key for transaction signing
 *
 * WARNING: This function provides access to the private key.
 * Only use in secure contexts for transaction signing.
 *
 * @returns Promise<string> Private key in bech32 format
 */
export async function getPlatformWalletPrivateKey(): Promise<string> {
  try {
    const walletService = getPlatformWalletService();
    return await walletService.getPrivateKey();
  } catch (error) {
    logger.error('Failed to get platform wallet private key', { error });
    throw error;
  }
}

/**
 * Get platform wallet public key
 *
 * @returns Promise<string> Public key in bech32 format
 */
export async function getPlatformWalletPublicKey(): Promise<string> {
  try {
    const walletService = getPlatformWalletService();
    return await walletService.getPublicKey();
  } catch (error) {
    logger.error('Failed to get platform wallet public key', { error });
    throw error;
  }
}

/**
 * Check platform wallet balance and alert if low
 *
 * This function should be called periodically to monitor wallet balance
 * and alert operations team if balance is low.
 */
export async function checkAndAlertLowBalance(): Promise<void> {
  try {
    const walletService = getPlatformWalletService();
    await walletService.checkBalanceThreshold();
  } catch (error) {
    // Error is already logged in the service
    // Re-throw to allow caller to handle
    throw error;
  }
}

/**
 * Format lovelace amount to ADA string
 *
 * @param lovelace Amount in lovelace
 * @returns ADA amount as string
 */
export function formatLovelaceToAda(lovelace: number | string): string {
  const lovelaceNum = typeof lovelace === 'string' ? parseInt(lovelace) : lovelace;
  return (lovelaceNum / 1_000_000).toFixed(6);
}

/**
 * Format ADA amount to lovelace
 *
 * @param ada Amount in ADA
 * @returns Lovelace amount as number
 */
export function formatAdaToLovelace(ada: number | string): number {
  const adaNum = typeof ada === 'string' ? parseFloat(ada) : ada;
  return Math.floor(adaNum * 1_000_000);
}
