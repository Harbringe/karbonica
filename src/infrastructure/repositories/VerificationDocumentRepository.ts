import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  VerificationDocument,
  CreateVerificationDocumentData,
} from '../../domain/entities/VerificationDocument';
import { IVerificationDocumentRepository } from '../../domain/repositories/IVerificationDocumentRepository';
import { database } from '../../config/database';

export class VerificationDocumentRepository implements IVerificationDocumentRepository {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  async findById(id: string): Promise<VerificationDocument | null> {
    const query = `
      SELECT 
        id, verification_id as "verificationId", name, description,
        document_type as "documentType", file_url as "fileUrl", 
        file_size as "fileSize", mime_type as "mimeType", 
        uploaded_by as "uploadedBy", uploaded_at as "uploadedAt"
      FROM verification_documents
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (!result.rows[0]) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  async findByVerification(verificationId: string): Promise<VerificationDocument[]> {
    const query = `
      SELECT 
        id, verification_id as "verificationId", name, description,
        document_type as "documentType", file_url as "fileUrl", 
        file_size as "fileSize", mime_type as "mimeType", 
        uploaded_by as "uploadedBy", uploaded_at as "uploadedAt"
      FROM verification_documents
      WHERE verification_id = $1
      ORDER BY uploaded_at DESC
    `;

    const result = await this.pool.query(query, [verificationId]);
    return result.rows.map((row) => this.mapRowToDocument(row));
  }

  async save(data: CreateVerificationDocumentData): Promise<VerificationDocument> {
    const id = uuidv4();
    const uploadedAt = new Date();

    const query = `
      INSERT INTO verification_documents (
        id, verification_id, name, description, document_type,
        file_url, file_size, mime_type, uploaded_by, uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, verification_id as "verificationId", name, description,
        document_type as "documentType", file_url as "fileUrl", 
        file_size as "fileSize", mime_type as "mimeType", 
        uploaded_by as "uploadedBy", uploaded_at as "uploadedAt"
    `;

    const values = [
      id,
      data.verificationId,
      data.name,
      data.description || null,
      data.documentType,
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
    const query = 'DELETE FROM verification_documents WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async count(verificationId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM verification_documents WHERE verification_id = $1';
    const result = await this.pool.query(query, [verificationId]);
    return parseInt(result.rows[0].count);
  }

  private mapRowToDocument(row: any): VerificationDocument {
    return {
      id: row.id,
      verificationId: row.verificationId,
      name: row.name,
      description: row.description,
      documentType: row.documentType,
      fileUrl: row.fileUrl,
      fileSize: parseInt(row.fileSize),
      mimeType: row.mimeType,
      uploadedBy: row.uploadedBy,
      uploadedAt: new Date(row.uploadedAt),
    };
  }
}
