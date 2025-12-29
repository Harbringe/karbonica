-- Rollback: Remove COT Marketplace tables

DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON marketplace_listings;

DROP INDEX IF EXISTS idx_price_history_event_type;
DROP INDEX IF EXISTS idx_price_history_recorded_at;
DROP INDEX IF EXISTS idx_price_history_cot_token;

DROP INDEX IF EXISTS idx_marketplace_sales_tx_hash;
DROP INDEX IF EXISTS idx_marketplace_sales_purchased_at;
DROP INDEX IF EXISTS idx_marketplace_sales_seller;
DROP INDEX IF EXISTS idx_marketplace_sales_buyer;
DROP INDEX IF EXISTS idx_marketplace_sales_cot_token;
DROP INDEX IF EXISTS idx_marketplace_sales_listing;

DROP INDEX IF EXISTS idx_marketplace_listings_utxo;
DROP INDEX IF EXISTS idx_marketplace_listings_price;
DROP INDEX IF EXISTS idx_marketplace_listings_listed_at;
DROP INDEX IF EXISTS idx_marketplace_listings_status;
DROP INDEX IF EXISTS idx_marketplace_listings_seller;
DROP INDEX IF EXISTS idx_marketplace_listings_cot_token;

DROP TABLE IF EXISTS marketplace_price_history;
DROP TABLE IF EXISTS marketplace_sales;
DROP TABLE IF EXISTS marketplace_listings;
