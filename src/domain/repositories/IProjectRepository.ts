import { Project } from '../entities/Project';

export interface ProjectFilters {
  status?: string;
  type?: string;
  developerId?: string;
  country?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByDeveloper(
    developerId: string,
    filters?: ProjectFilters,
    pagination?: PaginationOptions
  ): Promise<Project[]>;
  findAll(filters?: ProjectFilters, pagination?: PaginationOptions): Promise<Project[]>;
  save(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
  count(filters?: ProjectFilters): Promise<number>;
}
