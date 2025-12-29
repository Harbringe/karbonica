-- Remove blockchain-specific columns from projects
ALTER TABLE projects 
DROP COLUMN IF EXISTS reference_nft_policy_id,
DROP COLUMN IF EXISTS reference_nft_asset_name,
DROP COLUMN IF EXISTS reference_nft_utxo_ref,
DROP COLUMN IF EXISTS nft_state,
DROP COLUMN IF EXISTS nft_metadata,
DROP COLUMN IF EXISTS nft_minted_at,
DROP COLUMN IF EXISTS nft_updated_at,
DROP COLUMN IF EXISTS nft_state_transition_tx_hash;

-- Remove blockchain-specific columns from credit_entries
ALTER TABLE credit_entries
DROP COLUMN IF EXISTS policy_id,
DROP COLUMN IF EXISTS asset_name,
DROP COLUMN IF EXISTS mint_tx_hash,
DROP COLUMN IF EXISTS token_metadata,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Remove blockchain-specific columns from credit_transactions
ALTER TABLE credit_transactions
DROP COLUMN IF EXISTS blockchain_tx_hash;

-- Clean up possibly existing dependent tables from previous experiments
DROP TABLE IF EXISTS marketplace_sales CASCADE;
DROP TABLE IF EXISTS marketplace_price_history CASCADE;

-- Recreate marketplace tables to ensure Pure Web2 schema
DROP TABLE IF EXISTS marketplace_purchases CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id),
    credit_id UUID NOT NULL REFERENCES credit_entries(id),
    quantity DECIMAL(19, 4) NOT NULL,
    price_per_credit DECIMAL(19, 4) NOT NULL,
    total_price DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create marketplace_purchases table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
    id UUID PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    credit_entry_id UUID NOT NULL REFERENCES credit_entries(id),
    quantity DECIMAL(19, 4) NOT NULL,
    price_per_credit DECIMAL(19, 4) NOT NULL,
    total_price DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    buyer_credit_entry_id UUID REFERENCES credit_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_credit_id ON marketplace_listings(credit_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer_id ON marketplace_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller_id ON marketplace_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing_id ON marketplace_purchases(listing_id);
