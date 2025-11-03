import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectStatus, CreateProjectData } from '../../domain/entities/Project';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { VerificationRequest, VerificationStatus } from '../../domain/entities/VerificationRequest';
import { IVerificationRequestRepository } from '../../domain/repositories/IVerificationRequestRepository';
import { validateProjectData } from '../../utils/projectValidation';
import { validateCountryCode } from '../../utils/countryValidation';
import { logger } from '../../utils/logger';

export class ProjectService {
  constructor(
    private projectRepository: IProjectRepository,
    private verificationRequestRepository: IVerificationRequestRepository
  ) {}

  /**
   * Create a new project
   * @param data - Project creation data
   * @returns The created project
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    try {
      // Validate project data
      validateProjectData({
        title: data.title,
        type: data.type,
        description: data.description,
        location: data.location,
        country: data.country,
        emissionsTarget: data.emissionsTarget,
        startDate: data.startDate,
        coordinates: data.coordinates,
      });

      // Normalize country code to uppercase
      const normalizedCountry = validateCountryCode(data.country);

      // Create project entity
      const project: Project = {
        id: uuidv4(),
        developerId: data.developerId,
        title: data.title.trim(),
        type: data.type,
        description: data.description.trim(),
        location: data.location.trim(),
        country: normalizedCountry,
        coordinates: data.coordinates || null,
        emissionsTarget: data.emissionsTarget,
        startDate: data.startDate,
        status: ProjectStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save project to database
      const savedProject = await this.projectRepository.save(project);

      // Automatically create verification request for the project
      const verificationRequest: VerificationRequest = {
        id: uuidv4(),
        projectId: savedProject.id,
        developerId: savedProject.developerId,
        verifierId: null,
        status: VerificationStatus.PENDING,
        progress: 0,
        submittedAt: new Date(),
        assignedAt: null,
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.verificationRequestRepository.save(verificationRequest);

      logger.info('Project created successfully with verification request', {
        projectId: savedProject.id,
        verificationRequestId: verificationRequest.id,
        developerId: savedProject.developerId,
        title: savedProject.title,
        type: savedProject.type,
      });

      return savedProject;
    } catch (error) {
      logger.error('Error creating project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
      throw error;
    }
  }

  /**
   * Get project by ID
   * @param projectId - The project ID
   * @returns The project or null if not found
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const project = await this.projectRepository.findById(projectId);

      if (!project) {
        logger.warn('Project not found', { projectId });
      }

      return project;
    } catch (error) {
      logger.error('Error fetching project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      });
      throw error;
    }
  }

  /**
   * Get projects by developer
   * @param developerId - The developer user ID
   * @param filters - Optional filters
   * @param pagination - Optional pagination options
   * @returns List of projects
   */
  async getProjectsByDeveloper(
    developerId: string,
    filters?: any,
    pagination?: any
  ): Promise<Project[]> {
    try {
      const projects = await this.projectRepository.findByDeveloper(
        developerId,
        filters,
        pagination
      );

      logger.info('Projects fetched for developer', {
        developerId,
        count: projects.length,
      });

      return projects;
    } catch (error) {
      logger.error('Error fetching projects for developer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        developerId,
      });
      throw error;
    }
  }

  /**
   * Get all projects with optional filters
   * @param filters - Optional filters
   * @param pagination - Optional pagination options
   * @returns List of projects
   */
  async getAllProjects(filters?: any, pagination?: any): Promise<Project[]> {
    try {
      const projects = await this.projectRepository.findAll(filters, pagination);

      logger.info('Projects fetched', {
        count: projects.length,
        filters,
      });

      return projects;
    } catch (error) {
      logger.error('Error fetching projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Count projects with optional filters
   * @param filters - Optional filters
   * @returns Total count of projects
   */
  async countProjects(filters?: any): Promise<number> {
    try {
      const count = await this.projectRepository.count(filters);
      return count;
    } catch (error) {
      logger.error('Error counting projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Update project
   * @param projectId - The project ID
   * @param developerId - The developer ID (for authorization)
   * @param updateData - The data to update
   * @returns The updated project
   */
  async updateProject(projectId: string, developerId: string, updateData: any): Promise<Project> {
    try {
      // Get existing project
      const existingProject = await this.projectRepository.findById(projectId);

      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Check if user is the developer
      if (existingProject.developerId !== developerId) {
        throw new Error('Unauthorized: Only the project developer can update this project');
      }

      // Check if project is still in pending status
      if (existingProject.status !== ProjectStatus.PENDING) {
        throw new Error('Cannot update project after verification has started');
      }

      // Merge update data with existing project
      const updatedProject: Project = {
        ...existingProject,
        ...updateData,
        id: existingProject.id,
        developerId: existingProject.developerId,
        status: existingProject.status,
        createdAt: existingProject.createdAt,
        updatedAt: new Date(),
      };

      // Validate updated data
      if (updateData.country) {
        updatedProject.country = validateCountryCode(updateData.country);
      }

      // Save updated project
      const savedProject = await this.projectRepository.update(updatedProject);

      logger.info('Project updated successfully', {
        projectId: savedProject.id,
        developerId: savedProject.developerId,
      });

      return savedProject;
    } catch (error) {
      logger.error('Error updating project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        developerId,
      });
      throw error;
    }
  }

  /**
   * Delete project
   * @param projectId - The project ID
   * @param developerId - The developer ID (for authorization)
   */
  async deleteProject(projectId: string, developerId: string): Promise<void> {
    try {
      // Get existing project
      const existingProject = await this.projectRepository.findById(projectId);

      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Check if user is the developer
      if (existingProject.developerId !== developerId) {
        throw new Error('Unauthorized: Only the project developer can delete this project');
      }

      // Check if project is still in pending status
      if (existingProject.status !== ProjectStatus.PENDING) {
        throw new Error('Cannot delete project after verification has started');
      }

      // Delete project
      await this.projectRepository.delete(projectId);

      logger.info('Project deleted successfully', {
        projectId,
        developerId,
      });
    } catch (error) {
      logger.error('Error deleting project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        developerId,
      });
      throw error;
    }
  }
}
