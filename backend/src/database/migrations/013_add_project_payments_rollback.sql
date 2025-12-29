-- Rollback: Remove Project Payments table
-- Date: 2025-11-22

DROP INDEX IF EXISTS idx_project_payments_tx_hash;
DROP INDEX IF EXISTS idx_project_payments_status;
DROP INDEX IF EXISTS idx_project_payments_payment_address;
DROP INDEX IF EXISTS idx_project_payments_project_id;

DROP TABLE IF EXISTS project_payments;
