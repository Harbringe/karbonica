import { BlockfrostProvider } from '@meshsdk/core';
import * as meshCore from '@meshsdk/core';

async function debugMintingAPIs() {
  try {
    console.log('=== Testing MeshSDK Minting APIs ===\n');

    // Check what's exported from @meshsdk/core
    console.log('Checking @meshsdk/core exports:');
    console.log('- ForgeScript:', typeof (meshCore as any).ForgeScript);
    console.log('- NativeScript:', typeof (meshCore as any).NativeScript);
    console.log('- Transaction:', typeof (meshCore as any).Transaction);
    console.log('- Mint:', typeof (meshCore as any).Mint);
    console.log('- AssetMetadata:', typeof (meshCore as any).AssetMetadata);

    // List all exports that contain 'forge', 'mint', or 'script'
    console.log('\n=== Exports containing "forge", "mint", or "script": ===');
    Object.keys(meshCore).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('forge') || lowerKey.includes('mint') || lowerKey.includes('script')) {
        console.log(`- ${key}:`, typeof (meshCore as any)[key]);
      }
    });

    // Test config values
    console.log('\n=== Testing MintingPolicyConfig values ===');
    const testConfig = {
      type: 'before' as const,
      slot: 12345678,
      scripts: [],
    };

    
    console.log('config.slot:', testConfig.slot);
    console.log('config.scripts:', testConfig.scripts);
    console.log('config.type:', testConfig.type);

    // Try to check if ForgeScript exists and what methods it has
    if ((meshCore as any).ForgeScript) {
      console.log('\n=== ForgeScript methods ===');
      const ForgeScript = (meshCore as any).ForgeScript;
      console.log('ForgeScript.withOneSignature:', typeof ForgeScript.withOneSignature);
      console.log('ForgeScript.withAllSignatures:', typeof ForgeScript.withAllSignatures);
      console.log('ForgeScript.withAnySignature:', typeof ForgeScript.withAnySignature);

      // Try to create a simple forge script
      try {
        const testAddress = 'addr_test1qz...'; // dummy address
        const script = ForgeScript.withOneSignature(testAddress);
        console.log('\nForgeScript.withOneSignature() returns:', typeof script);
        console.log('Script value:', script);

        // Check if it has methods
        if (script && typeof script === 'object') {
          console.log('Script methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(script)));
        }
      } catch (e: any) {
        console.log('Error creating ForgeScript:', e.message);
      }
    }

    // Check NativeScript from core-cst
    console.log('\n=== Checking @meshsdk/core-cst ===');
    const coreCst = await import('@meshsdk/core-cst');
    console.log('NativeScript from core-cst:', typeof coreCst.NativeScript);

    if (coreCst.NativeScript) {
      console.log('NativeScript properties:', Object.keys(coreCst.NativeScript));
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugMintingAPIs();
