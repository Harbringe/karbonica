import { z } from 'zod';

// Request validation schema
export const uploadProjectDocumentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
  }),
});

// Response types
export interface ProjectDocumentData {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectDocumentResponse {
  status: 'success';
  data: {
    document: ProjectDocumentData;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProjectDocumentListResponse {
  status: 'success';
  data: {
    documents: ProjectDocumentData[];
    count: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
