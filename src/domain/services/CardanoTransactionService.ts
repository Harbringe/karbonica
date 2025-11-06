import { BlockfrostProvider, MeshTxBuilder } from '@meshsdk/core';

import { PlatformWalletService } from '../../infrastructure/services/PlatformWalletService';
import { getCardanoConfig } from '../../config/cardano';
import { logger } from '../../utils/logger';

export interface TransactionMetadata {
  [key: string]: any;
}

export interface TransactionInput {
  txHash: string;
  outputIndex: number;
  amount: string;
  address: string;
}

export interface TransactionOutput {
  address: string;
  amount: string;
  assets?: Array<{
    unit: string;
    quantity: string;
  }>;
}

export interface UnsignedTransaction {
  txBody: string; // CBOR hex
  txHash: string;
  fee: string;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  metadata?: TransactionMetadata;
}

export class CardanoTransactionService {
  private platformWallet: PlatformWalletService;

  constructor(platformWallet: PlatformWalletService) {
    this.platformWallet = platformWallet;
  }

  async buildTransaction(
    outputs: TransactionOutput[],
    metadata?: TransactionMetadata
  ): Promise<UnsignedTransaction> {
    try {
      // Get the Mesh wallet from PlatformWalletService
      const meshWallet = await this.platformWallet.getMeshWallet();
      const utxos = await meshWallet.getUtxos();
      const changeAddress = await meshWallet.getChangeAddress();

      // Get the provider from PlatformWalletService
      const cardanoConfig = getCardanoConfig();
      const provider = new BlockfrostProvider(cardanoConfig.blockfrostApiKey);

      // Create transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
        verbose: true,
      });

      // Add outputs
      for (const output of outputs) {
        txBuilder.txOut(output.address, [
          {
            unit: 'lovelace',
            quantity: output.amount,
          },
        ]);
      }

      // Add metadata if provided (CIP-20 uses label 674)
      if (metadata) {
        txBuilder.metadataValue(674, { msg: [JSON.stringify(this.formatCip20Metadata(metadata))] });
      }

      // Set change address and select UTxOs
      const unsignedTx = await txBuilder
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      // Calculate the fee for this transaction
      const calculatedFee = await this.calculateFee(outputs, metadata);

      return {
        txBody: unsignedTx, // This is already CBOR hex string
        txHash: '', // Will be set after signing
        fee: calculatedFee,
        inputs: [],
        outputs: outputs,
        metadata: metadata,
      };
    } catch (error) {
      logger.error('Failed to build transaction', { error });
      throw new CardanoTransactionError('Failed to build transaction', error as Error);
    }
  }

  async getProtocolParameters(): Promise<any> {
    // Get the provider from PlatformWalletService
    const cardanoConfig = getCardanoConfig();
    const provider = new BlockfrostProvider(cardanoConfig.blockfrostApiKey);
    return await provider.fetchProtocolParameters();
  }

  async selectUtxos(requiredAmount: string): Promise<TransactionInput[]> {
    const meshWallet = await this.platformWallet.getMeshWallet();
    const utxos = await meshWallet.getUtxos();
    const walletAddress = await meshWallet.getChangeAddress();

    let totalAmount = 0n;
    const selectedUtxos: TransactionInput[] = [];

    for (const utxo of utxos) {
      const lovelaceAsset = utxo.output.amount.find((asset: any) => asset.unit === 'lovelace');
      const lovelace = lovelaceAsset ? BigInt(lovelaceAsset.quantity) : 0n;

      selectedUtxos.push({
        txHash: utxo.input.txHash,
        outputIndex: utxo.input.outputIndex,
        amount: lovelace.toString(),
        address: walletAddress,
      });

      totalAmount += lovelace;
      if (totalAmount >= BigInt(requiredAmount)) {
        break;
      }
    }

    return selectedUtxos;
  }

  async calculateFee(
    outputs: TransactionOutput[],
    metadata?: TransactionMetadata
  ): Promise<string> {
    try {
      // Get the Mesh wallet and provider from PlatformWalletService
      const meshWallet = await this.platformWallet.getMeshWallet();
      const utxos = await meshWallet.getUtxos();

      // Get the provider from PlatformWalletService
      const cardanoConfig = getCardanoConfig();
      const provider = new BlockfrostProvider(cardanoConfig.blockfrostApiKey);

      // Create transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        verbose: true,
      });

      // Add outputs
      for (const output of outputs) {
        txBuilder.txOut(output.address, [
          {
            unit: 'lovelace',
            quantity: output.amount,
          },
        ]);
      }

      // Add metadata if provided (CIP-20 uses label 674)
      if (metadata) {
        txBuilder.metadataValue(674, { msg: [JSON.stringify(this.formatCip20Metadata(metadata))] });
      }

      // Get protocol parameters for fee estimation
      const protocolParams = await provider.fetchProtocolParameters();
      const baseFee = protocolParams.minFeeA || 44;
      const feePerByte = protocolParams.minFeeB || 155381;

      // Estimate transaction size based on inputs/outputs
      // Base transaction size + outputs + metadata + estimated inputs
      const estimatedInputs = Math.min(utxos.length, 3); // Estimate max 3 inputs needed
      const estimatedSize =
        200 + // Base transaction overhead
        outputs.length * 50 + // Each output ~50 bytes
        estimatedInputs * 180 + // Each input ~180 bytes
        (metadata ? 100 : 0); // Metadata overhead

      const estimatedFee = estimatedSize * feePerByte + baseFee;

      logger.info('Transaction fee calculated', {
        estimatedFee: estimatedFee.toString(),
        outputCount: outputs.length,
        hasMetadata: !!metadata,
        estimatedSize,
      });

      return estimatedFee.toString();
    } catch (error) {
      logger.error('Failed to calculate transaction fee', { error });
      throw new CardanoTransactionError('Failed to calculate transaction fee', error as Error);
    }
  }

  formatCip20Metadata(data: any): TransactionMetadata {
    // CIP-20 standard format for carbon credits
    return {
      carbon_credit: {
        version: '1.0',
        action: data.action, // "retirement", "transfer", "issuance"
        credit_id: data.creditId,
        project_id: data.projectId,
        quantity: data.quantity,
        vintage: data.vintage,
        timestamp: new Date().toISOString(),
        ...data,
      },
    };
  }
}

export class CardanoTransactionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CardanoTransactionError';
  }
}
