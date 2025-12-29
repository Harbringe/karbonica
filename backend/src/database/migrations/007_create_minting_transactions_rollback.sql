-- Rollback Migration: 007_create_minting_transactions
-- Description: Drop minting_transactions table and related objects
-- Date: 2025-11-08

-- Drop the table (CASCADE will drop the trigger automatically)
DROP TABLE IF EXISTS minting_transactions CASCADE;

-- Drop the enum type
DROP TYPE IF EXISTS minting_operation;
