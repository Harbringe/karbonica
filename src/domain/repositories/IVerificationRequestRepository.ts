import { VerificationRequest } from '../entities/VerificationRequest';

export interface VerificationFilters {
  status?: string;
  developerId?: string;
  verifierId?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IVerificationRequestRepository {
  findById(id: string): Promise<VerificationRequest | null>;
  findByProject(projectId: string): Promise<VerificationRequest | null>;
  findByDeveloper(
    developerId: string,
    filters?: VerificationFilters,
    pagination?: PaginationOptions
  ): Promise<VerificationRequest[]>;
  findByVerifier(
    verifierId: string,
    filters?: VerificationFilters,
    pagination?: PaginationOptions
  ): Promise<VerificationRequest[]>;
  findAll(
    filters?: VerificationFilters,
    pagination?: PaginationOptions
  ): Promise<VerificationRequest[]>;
  save(verification: VerificationRequest): Promise<VerificationRequest>;
  update(verification: VerificationRequest): Promise<VerificationRequest>;
  count(filters?: VerificationFilters): Promise<number>;
}
