-- Rollback: 020_add_project_extended_fields
-- Description: Remove image_url, estimated_completion_date, and contact_info fields from projects table

-- Drop index
DROP INDEX IF EXISTS idx_projects_estimated_completion_date;

-- Remove columns
ALTER TABLE projects DROP COLUMN IF EXISTS image_url;
ALTER TABLE projects DROP COLUMN IF EXISTS estimated_completion_date;
ALTER TABLE projects DROP COLUMN IF EXISTS contact_info;
