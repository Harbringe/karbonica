import { ProjectDocument, CreateProjectDocumentData } from '../entities/ProjectDocument';

export interface IProjectDocumentRepository {
  findById(id: string): Promise<ProjectDocument | null>;
  findByProject(projectId: string): Promise<ProjectDocument[]>;
  save(document: CreateProjectDocumentData): Promise<ProjectDocument>;
  delete(id: string): Promise<void>;
  count(projectId: string): Promise<number>;
}
