-- Migration: Add COT Marketplace tables
-- Description: Add tables to support COT marketplace listing and trading

-- Marketplace Listings table
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_entry_id UUID NOT NULL REFERENCES credit_entries(id) ON DELETE CASCADE,
    
    -- Seller information
    seller_user_id UUID NOT NULL REFERENCES users(id),
    seller_wallet_address VARCHAR(128) NOT NULL,
    
    -- Listing details
    cot_quantity DECIMAL(15,2) NOT NULL,
    price_per_token_lovelace BIGINT NOT NULL,
    total_price_lovelace BIGINT NOT NULL,
    
    -- Cardano smart contract info
    marketplace_utxo_tx_hash VARCHAR(64),
    marketplace_utxo_output_index INTEGER,
    marketplace_address VARCHAR(128),
    marketplace_datum_hash VARCHAR(64),
    
    -- Listing status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Timestamps
    listed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    sold_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (cot_quantity > 0),
    CONSTRAINT positive_price CHECK (price_per_token_lovelace > 0),
    CONSTRAINT valid_status CHECK (status IN ('active', 'sold', 'cancelled', 'expired'))
);

-- Marketplace Sales table
CREATE TABLE marketplace_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    credit_entry_id UUID NOT NULL REFERENCES credit_entries(id) ON DELETE CASCADE,
    
    -- Buyer information
    buyer_user_id UUID NOT NULL REFERENCES users(id),
    buyer_wallet_address VARCHAR(128) NOT NULL,
    
    -- Seller information
    seller_user_id UUID NOT NULL REFERENCES users(id),
    seller_wallet_address VARCHAR(128) NOT NULL,
    
    -- Sale details
    cot_quantity DECIMAL(15,2) NOT NULL,
    price_per_token_lovelace BIGINT NOT NULL,
    total_price_lovelace BIGINT NOT NULL,
    
    -- Payment breakdown
    seller_payment_lovelace BIGINT NOT NULL,
    platform_royalty_lovelace BIGINT NOT NULL,
    royalty_percentage DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    
    -- Cardano transaction info
    purchase_tx_hash VARCHAR(64) NOT NULL,
    purchase_block_number BIGINT,
    
    -- Timestamps
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_sale_quantity CHECK (cot_quantity > 0),
    CONSTRAINT positive_sale_price CHECK (total_price_lovelace > 0),
    CONSTRAINT positive_seller_payment CHECK (seller_payment_lovelace > 0),
    CONSTRAINT positive_platform_royalty CHECK (platform_royalty_lovelace >= 0)
);

-- Marketplace Price History
CREATE TABLE marketplace_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_entry_id UUID NOT NULL REFERENCES credit_entries(id) ON DELETE CASCADE,
    
    price_per_token_lovelace BIGINT NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    
    listing_id UUID REFERENCES marketplace_listings(id),
    sale_id UUID REFERENCES marketplace_sales(id),
    
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_event_type CHECK (event_type IN ('listed', 'sold', 'cancelled', 'price_updated'))
);

-- Indexes
CREATE INDEX idx_marketplace_listings_credit_entry ON marketplace_listings(credit_entry_id);
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_user_id);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_listed_at ON marketplace_listings(listed_at);
CREATE INDEX idx_marketplace_listings_price ON marketplace_listings(price_per_token_lovelace);
CREATE INDEX idx_marketplace_listings_utxo ON marketplace_listings(marketplace_utxo_tx_hash, marketplace_utxo_output_index);

CREATE INDEX idx_marketplace_sales_listing ON marketplace_sales(listing_id);
CREATE INDEX idx_marketplace_sales_credit_entry ON marketplace_sales(credit_entry_id);
CREATE INDEX idx_marketplace_sales_buyer ON marketplace_sales(buyer_user_id);
CREATE INDEX idx_marketplace_sales_seller ON marketplace_sales(seller_user_id);
CREATE INDEX idx_marketplace_sales_purchased_at ON marketplace_sales(purchased_at);
CREATE INDEX idx_marketplace_sales_tx_hash ON marketplace_sales(purchase_tx_hash);

CREATE INDEX idx_price_history_credit_entry ON marketplace_price_history(credit_entry_id);
CREATE INDEX idx_price_history_recorded_at ON marketplace_price_history(recorded_at);
CREATE INDEX idx_price_history_event_type ON marketplace_price_history(event_type);

-- Trigger
CREATE TRIGGER update_marketplace_listings_updated_at 
    BEFORE UPDATE ON marketplace_listings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
