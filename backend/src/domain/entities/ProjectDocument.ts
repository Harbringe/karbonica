export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: string; // user ID
  uploadedAt: Date;
}

export interface CreateProjectDocumentData {
  projectId: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
}
