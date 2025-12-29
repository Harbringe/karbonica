-- Rollback Migration: 011_create_smart_contract_tables
-- Description: Drop all smart contract integration tables
-- Date: 2024-11-19

-- Drop triggers first
DROP TRIGGER IF EXISTS update_smart_contract_transactions_updated_at ON smart_contract_transactions;
DROP TRIGGER IF EXISTS update_retirement_certificates_updated_at ON retirement_certificates;
DROP TRIGGER IF EXISTS update_wallet_monitoring_updated_at ON wallet_monitoring;
DROP TRIGGER IF EXISTS update_platform_tokens_updated_at ON platform_tokens;

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS smart_contract_transactions CASCADE;
DROP TABLE IF EXISTS retirement_certificates CASCADE;
DROP TABLE IF EXISTS wallet_monitoring CASCADE;
DROP TABLE IF EXISTS platform_tokens CASCADE;

-- Note: We don't drop the update_updated_at_column function as it may be used by other tables
