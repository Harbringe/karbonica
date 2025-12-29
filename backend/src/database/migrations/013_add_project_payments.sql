-- Migration: Add Project Payments table
-- Description: Track payment status for project NFT minting
-- Date: 2025-11-22

CREATE TABLE IF NOT EXISTS project_payments (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_address VARCHAR(255) NOT NULL,
  required_amount BIGINT NOT NULL DEFAULT 2000000,
  paid_amount BIGINT,
  payment_tx_hash VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT project_payments_status_check CHECK (status IN ('pending', 'paid', 'confirmed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_payment_address ON project_payments(payment_address);
CREATE INDEX IF NOT EXISTS idx_project_payments_status ON project_payments(status);
CREATE INDEX IF NOT EXISTS idx_project_payments_tx_hash ON project_payments(payment_tx_hash);
