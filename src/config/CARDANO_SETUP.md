# Cardano Integration Setup Guide

This guide explains how to set up and configure Cardano blockchain integration for the Karbonica Carbon Credit Registry Platform.

## Overview

The platform integrates with Cardano Preview testnet via Blockfrost API to provide:
- Immutable transaction records for credit retirements
- Transparent audit trail for carbon credit operations
- Cryptographic proof of retirement with blockchain verification

## Prerequisites

1. **Blockfrost API Account**
   - Sign up at [https://blockfrost.io](https://blockfrost.io)
   - Create a new project for Cardano Preview testnet
   - Copy your API key (starts with `preview`)

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Cardano Configuration
CARDANO_NETWORK=preview
BLOCKFROST_API_KEY=previewYourApiKeyHere
BLOCKFROST_URL=https://cardano-preview.blockfrost.io/api/v0
```

### 2. Network Options

The platform supports three Cardano networks:

| Network   | Environment    | Purpose                      | Blockfrost URL                                 |
| --------- | -------------- | ---------------------------- | ---------------------------------------------- |
| `preview` | Testing        | Development and testing      | `https://cardano-preview.blockfrost.io/api/v0` |
| `preprod` | Pre-production | Final testing before mainnet | `https://cardano-preprod.blockfrost.io/api/v0` |
| `mainnet` | Production     | Live production environment  | `https://cardano-mainnet.blockfrost.io/api/v0` |

**Recommendation**: Use `preview` for development and testing.

## Dependencies

The following npm packages are installed:

```json
{
  "@emurgo/cardano-serialization-lib-nodejs": "^12.x.x",
  "@blockfrost/blockfrost-js": "^5.x.x"
}
```

## Usage

### Import Configuration

```typescript
import {
  getCardanoConfig,
  initializeBlockfrostClient,
  validateCardanoConfig,
  getExplorerUrl,
  getNetworkInfo,
} from './config/cardano';
```

### Initialize Blockfrost Client

```typescript
const client = initializeBlockfrostClient();

// Fetch latest block
const latestBlock = await client.blocksLatest();
console.log('Latest block:', latestBlock.height);

// Fetch protocol parameters
const params = await client.epochsLatestParameters();
console.log('Min fee:', params.min_fee_a);
```

### Get Configuration

```typescript
const config = getCardanoConfig();
console.log('Network:', config.network);
console.log('Confirmations required:', config.confirmationsRequired);
console.log('Transaction timeout:', config.transactionTimeout);
```

### Validate Configuration

```typescript
try {
  validateCardanoConfig();
  console.log('Cardano configuration is valid');
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

### Get Explorer URL

```typescript
const txHash = 'abc123...';
const explorerUrl = getExplorerUrl(txHash);
console.log('View transaction:', explorerUrl);
// Output: https://preview.cardanoscan.io/transaction/abc123...
```

### Get Network Information

```typescript
const networkInfo = getNetworkInfo();
console.log('Network name:', networkInfo.name);
console.log('Block time:', networkInfo.blockTime, 'seconds');
console.log('Protocol magic:', networkInfo.protocolMagic);
```

## Configuration Parameters

| Parameter               | Default | Description                                          |
| ----------------------- | ------- | ---------------------------------------------------- |
| `confirmationsRequired` | 6       | Number of block confirmations (~2 minutes)           |
| `transactionTimeout`    | 600000  | Transaction timeout in milliseconds (10 minutes)     |
| `pollingInterval`       | 20000   | Status polling interval in milliseconds (20 seconds) |
| `maxRetries`            | 3       | Maximum retry attempts for failed transactions       |
| `retryBackoffMs`        | 1000    | Initial backoff delay for retries (exponential)      |

## Testing

### Unit Tests

Run unit tests for configuration:

```bash
npm test -- src/config/cardano.test.ts
```

### Integration Tests

Run integration tests (requires valid API key):

```bash
npm test -- src/config/cardano.integration.test.ts
```

## Blockfrost API Limits

### Free Tier
- 50,000 requests per day
- 50 requests per second
- Suitable for development and testing

### Paid Tiers
- Higher rate limits
- Priority support
- Required for production

**Important**: Implement request queuing and caching to stay within rate limits.

## Troubleshooting

### Error: "BLOCKFROST_API_KEY is required"

**Solution**: Ensure `BLOCKFROST_API_KEY` is set in your `.env` file.

### Error: "Blockfrost URL does not match network"

**Solution**: Verify that your `BLOCKFROST_URL` matches your `CARDANO_NETWORK`:
- `preview` → `cardano-preview.blockfrost.io`
- `preprod` → `cardano-preprod.blockfrost.io`
- `mainnet` → `cardano-mainnet.blockfrost.io`

### Warning: "API key does not start with expected prefix"

**Solution**: Ensure your API key starts with the network name:
- Preview keys start with `preview`
- Preprod keys start with `preprod`
- Mainnet keys start with `mainnet`

### Rate Limit Exceeded

**Solution**: 
1. Implement request caching (60 second TTL recommended)
2. Use request queuing with exponential backoff
3. Upgrade to a paid Blockfrost plan

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive configuration
3. **Rotate API keys** regularly (every 90 days)
4. **Monitor API usage** to detect anomalies
5. **Use separate keys** for development, staging, and production

## Next Steps

After setting up Cardano integration:

1. Implement wallet linking (Task 8)
2. Implement wallet authentication (Task 9)
3. Implement transaction building (Task 27)
4. Implement transaction submission (Task 28)
5. Implement transaction monitoring (Task 29)

## Resources

- [Blockfrost Documentation](https://docs.blockfrost.io/)
- [Cardano Documentation](https://docs.cardano.org/)
- [Cardano Serialization Library](https://github.com/Emurgo/cardano-serialization-lib)
- [Cardano Preview Explorer](https://preview.cardanoscan.io/)
- [CIP-20 Transaction Messages](https://cips.cardano.org/cips/cip20/)

## Support

For issues with:
- **Blockfrost API**: Contact [Blockfrost Support](https://blockfrost.io/support)
- **Cardano Integration**: Open an issue in the project repository
- **Configuration**: Check this guide and the `.env.example` file
