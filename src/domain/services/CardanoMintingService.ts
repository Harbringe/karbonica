import {
  ForgeScript,
  MeshTxBuilder,
  resolveScriptHash,
  stringToHex,
  NativeScript,
  deserializeAddress,
  BlockfrostProvider,
} from '@meshsdk/core';
import { getCardanoConfig } from '../../config/cardano';
import { MintingTransaction, MintingOperationType } from '../entities/MintingTransaction';
import { MintingTransactionRepository } from '../repositories/IMintingTransactionRepository';
import { PlatformWalletService } from '../../infrastructure/services/PlatformWalletService';

export interface MintingPolicyConfig {
  type: 'all' | 'any' | 'before' | 'after';
  slot?: number;
  keyHash?: string;
  scripts?: string[];
}

export interface MintAssetParams {
  projectId: string;
  assetName: string;
  quantity: string;
  metadata?: Record<string, any>;
  policyConfig?: MintingPolicyConfig;
}
export interface BurnAssetParams {
  projectId: string;
  policyId: string;
  assetName: string;
  quantity: string;
}

export class CardanoMintingService {
  constructor(
    private mintingTxRepo: MintingTransactionRepository,
    private platformWalletService: PlatformWalletService
  ) {}

  /**
   * Create a minting policy script
   */
  async createMintingPolicy(
    config?: MintingPolicyConfig
  ): Promise<{ script: ForgeScript; scriptCbor: string }> {
    const wallet = await this.platformWalletService.getMeshWallet();
    const address = await wallet.getChangeAddress();
    const { pubKeyHash: keyHash } = deserializeAddress(address);

    // Default: simple signature-based policy
    if (!config) {
      const script = ForgeScript.withOneSignature(address);
      return { script, scriptCbor: address }; // Store address as identifier
    }

    // Time-locked policy with native script
    if (config.type === 'before' && config.slot) {
      const nativeScript: NativeScript = {
        type: 'all',
        scripts: [
          { type: 'before', slot: config.slot.toString() },
          { type: 'sig', keyHash: keyHash },
        ],
      };
      const script = ForgeScript.fromNativeScript(nativeScript);
      return { script, scriptCbor: JSON.stringify(nativeScript) };
    }

    if (config.type === 'after' && config.slot) {
      const nativeScript: NativeScript = {
        type: 'all',
        scripts: [
          { type: 'after', slot: config.slot.toString() },
          { type: 'sig', keyHash: keyHash },
        ],
      };
      const script = ForgeScript.fromNativeScript(nativeScript);
      return { script, scriptCbor: JSON.stringify(nativeScript) };
    }

    // Multi-sig policies
    if (config.type === 'all' && config.scripts) {
      const nativeScript: NativeScript = {
        type: 'all',
        scripts: config.scripts.map((s) => ({ type: 'sig', keyHash: s })),
      };
      const script = ForgeScript.fromNativeScript(nativeScript);
      return { script, scriptCbor: JSON.stringify(nativeScript) };
    }

    if (config.type === 'any' && config.scripts) {
      const nativeScript: NativeScript = {
        type: 'any',
        scripts: config.scripts.map((s) => ({ type: 'sig', keyHash: s })),
      };
      const script = ForgeScript.fromNativeScript(nativeScript);
      return { script, scriptCbor: JSON.stringify(nativeScript) };
    }

    const script = ForgeScript.withOneSignature(address);
    return { script, scriptCbor: address };
  }

  /**
   * Mint native tokens
   */
  async mintAsset(params: MintAssetParams): Promise<MintingTransaction> {
    const { projectId, assetName, quantity, metadata, policyConfig } = params;

    // Create minting policy
    const wallet = await this.platformWalletService.getMeshWallet();
    const address = await wallet.getChangeAddress();
    const utxos = await wallet.getUtxos();

    // Create minting policy
    const { script: forgingScript, scriptCbor } = await this.createMintingPolicy(policyConfig);
    const policyId = resolveScriptHash(forgingScript as any);
    const tokenNameHex = stringToHex(assetName);

    const txMetadata = metadata
      ? {
          [policyId]: {
            [assetName]: metadata,
          },
        }
      : undefined;

    // Build transaction with MeshTxBuilder
    const cardanoConfig = getCardanoConfig();
    const provider = new BlockfrostProvider(cardanoConfig.blockfrostApiKey);

    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      verbose: true,
    });

    let unsignedTx = txBuilder
      .mint(quantity, policyId, tokenNameHex)
      .mintingScript(scriptCbor)
      .changeAddress(address)
      .selectUtxosFrom(utxos);

    if (txMetadata) {
      unsignedTx = unsignedTx.metadataValue('721', txMetadata);
    }

    const builtTx = await unsignedTx.complete();
    const signedTx = await wallet.signTx(builtTx);
    const txHash = await wallet.submitTx(signedTx);

    // Store minting record
    const mintingTx = this.mintingTxRepo.create({
      projectId,
      policyId,
      assetName,
      quantity,
      operation: MintingOperationType.MINT,
      txHash,
      metadata,
      policyScript: { cbor: scriptCbor, policyId },
    });

    await this.mintingTxRepo.save(mintingTx);
    return mintingTx;
  }

  /**
   * Burn native tokens
   */
  async burnAsset(params: BurnAssetParams): Promise<MintingTransaction> {
    const { projectId, policyId, assetName, quantity } = params;

    const wallet = await this.platformWalletService.getMeshWallet();
    const address = await wallet.getChangeAddress();
    const utxos = await wallet.getUtxos();

    // Get original minting transaction to retrieve policy script
    const originalMint = await this.mintingTxRepo.findOne({
      where: { projectId, policyId, assetName, operation: MintingOperationType.MINT },
    });

    if (!originalMint) {
      throw new Error('Original minting transaction not found');
    }

    // Get script CBOR from original mint
    const scriptData = originalMint.policyScript as any;
    const tokenNameHex = stringToHex(assetName);

    // Build burn transaction (negative quantity)
    const cardanoConfig = getCardanoConfig();
    const provider = new BlockfrostProvider(cardanoConfig.blockfrostApiKey);

    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      verbose: true,
    });

    const unsignedTx = await txBuilder
      .mint(`-${quantity}`, policyId, tokenNameHex)
      .mintingScript(scriptData.cbor)
      .changeAddress(address)
      .selectUtxosFrom(utxos)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    // Store burning record
    const burningTx = this.mintingTxRepo.create({
      projectId,
      policyId,
      assetName,
      quantity,
      operation: MintingOperationType.BURN,
      txHash,
      policyScript: originalMint.policyScript,
    });
    await this.mintingTxRepo.save(burningTx);
    return burningTx;
  }

  /**
   * Get minting history for a project
   */
  async getMintingHistory(projectId: string): Promise<MintingTransaction[]> {
    return this.mintingTxRepo.findByProjectId(projectId);
  }

  /**
   * Get all assets minted under a policy
   */
  async getAssetsByPolicy(policyId: string): Promise<MintingTransaction[]> {
    return this.mintingTxRepo.findByPolicyId(policyId);
  }
}
