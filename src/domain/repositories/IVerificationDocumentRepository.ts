import {
  VerificationDocument,
  CreateVerificationDocumentData,
} from '../entities/VerificationDocument';

export interface IVerificationDocumentRepository {
  findById(id: string): Promise<VerificationDocument | null>;
  findByVerification(verificationId: string): Promise<VerificationDocument[]>;
  save(data: CreateVerificationDocumentData): Promise<VerificationDocument>;
  delete(id: string): Promise<void>;
  count(verificationId: string): Promise<number>;
}
