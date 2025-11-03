import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ProjectDocument, CreateProjectDocumentData } from '../../domain/entities/ProjectDocument';
import { IProjectDocumentRepository } from '../../domain/repositories/IProjectDocumentRepository';
import { database } from '../../config/database';

export class ProjectDocumentRepository implements IProjectDocumentRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async findById(id: string): Promise<ProjectDocument | null> {
    const query = `
      SELECT 
        id, project_id as "projectId", name, description,
        file_url as "fileUrl", file_size as "fileSize",
        mime_type as "mimeType", uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt"
      FROM project_documents
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (!result.rows[0]) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  async findByProject(projectId: string): Promise<ProjectDocument[]> {
    const query = `
      SELECT 
        id, project_id as "projectId", name, description,
        file_url as "fileUrl", file_size as "fileSize",
        mime_type as "mimeType", uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt"
      FROM project_documents
      WHERE project_id = $1
      ORDER BY uploaded_at DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows.map((row) => this.mapRowToDocument(row));
  }

  async save(data: CreateProjectDocumentData): Promise<ProjectDocument> {
    const id = uuidv4();
    const uploadedAt = new Date();

    const query = `
      INSERT INTO project_documents (
        id, project_id, name, description, file_url,
        file_size, mime_type, uploaded_by, uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, project_id as "projectId", name, description,
        file_url as "fileUrl", file_size as "fileSize",
        mime_type as "mimeType", uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt"
    `;

    const values = [
      id,
      data.projectId,
      data.name,
      data.description || null,
      data.fileUrl,
      data.fileSize,
      data.mimeType,
      data.uploadedBy,
      uploadedAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToDocument(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM project_documents WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async count(projectId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM project_documents WHERE project_id = $1';
    const result = await this.pool.query(query, [projectId]);
    return parseInt(result.rows[0].count);
  }

  private mapRowToDocument(row: any): ProjectDocument {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      fileUrl: row.fileUrl,
      fileSize: parseInt(row.fileSize),
      mimeType: row.mimeType,
      uploadedBy: row.uploadedBy,
      uploadedAt: new Date(row.uploadedAt),
    };
  }
}
