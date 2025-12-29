-- Migration: 020_add_project_extended_fields
-- Description: Add image_url, estimated_completion_date, and contact_info fields to projects table
-- Date: 2024-12-26

-- Add image_url column for project thumbnail
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add estimated_completion_date column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;

-- Add contact_info column as JSONB for project manager and organization info
-- Structure: { projectManagerName, projectManagerEmail, organizationName, organizationEmail }
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS contact_info JSONB;

-- Add comments for new columns
COMMENT ON COLUMN projects.image_url IS 'URL to the project thumbnail image';
COMMENT ON COLUMN projects.estimated_completion_date IS 'Expected project completion date';
COMMENT ON COLUMN projects.contact_info IS 'Contact information JSON: { projectManagerName, projectManagerEmail, organizationName, organizationEmail }';

-- Create index on estimated_completion_date for querying upcoming projects
CREATE INDEX IF NOT EXISTS idx_projects_estimated_completion_date ON projects(estimated_completion_date);
