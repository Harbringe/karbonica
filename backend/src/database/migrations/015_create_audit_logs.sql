-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON COLUMN audit_logs.timestamp IS 'Timestamp when the event occurred';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of audit event (authentication, authorization, data access, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Specific action performed';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (nullable for system events)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (project, credit, user, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before/after values for data changes';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context-specific metadata';
