-- Rollback Migration: 009_create_cot_burning_tables
-- Description: Rollback COT burning tables and columns
-- Date: 2024-11-11

-- Drop COT burn transactions table
DROP TABLE IF EXISTS cot_burn_transactions CASCADE;

-- Drop COT burning challenges table
DROP TABLE IF EXISTS cot_burning_challenges CASCADE;

-- Remove cot_quantity column from credit_entries
ALTER TABLE credit_entries 
DROP COLUMN IF EXISTS cot_quantity;

-- Drop index (if it exists)
DROP INDEX IF EXISTS idx_credit_entries_cot_quantity;

