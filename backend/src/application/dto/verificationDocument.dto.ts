import { z } from 'zod';

// Request validation schema
export const uploadVerificationDocumentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    documentType: z.string().min(1).max(100),
  }),
});

// Response types
export interface VerificationDocumentData {
  id: string;
  verificationId: string;
  name: string;
  description: string | null;
  documentType: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface VerificationDocumentResponse {
  status: 'success';
  data: {
    document: VerificationDocumentData;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface VerificationDocumentListResponse {
  status: 'success';
  data: {
    documents: VerificationDocumentData[];
    count: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
