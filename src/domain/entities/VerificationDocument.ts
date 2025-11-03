export interface VerificationDocument {
  id: string;
  verificationId: string;
  name: string;
  description: string | null;
  documentType: string;
  fileUrl: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: string; // user ID
  uploadedAt: Date;
}

export interface CreateVerificationDocumentData {
  verificationId: string;
  name: string;
  description?: string;
  documentType: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
}
