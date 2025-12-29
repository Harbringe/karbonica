-- Migration: 005_add_project_documents
-- Description: Create project_documents table for storing project document metadata
-- Date: 2025-11-02

-- ============================================================================
-- PROJECT DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON project_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at ON project_documents(uploaded_at);

-- Add comment to table
COMMENT ON TABLE project_documents IS 'Stores metadata for documents uploaded to projects';
COMMENT ON COLUMN project_documents.file_url IS 'S3 URL or storage location of the document';
COMMENT ON COLUMN project_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN project_documents.mime_type IS 'MIME type of the uploaded file';
