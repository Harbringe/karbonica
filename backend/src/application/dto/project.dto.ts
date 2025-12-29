import { z } from 'zod';
import { ProjectType, ProjectStatus } from '../../domain/entities/Project';
import { ISO_3166_1_ALPHA_3_CODES } from '../../utils/countryValidation';

// Create project request schema
export const createProjectRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  type: z.nativeEnum(ProjectType, {
    errorMap: () => ({ message: 'Invalid project type' }),
  }),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  location: z
    .string()
    .min(1, 'Location is required')
    .max(255, 'Location must not exceed 255 characters'),
  country: z
    .string()
    .length(3, 'Country code must be 3 characters')
    .refine((code) => ISO_3166_1_ALPHA_3_CODES.includes(code.toUpperCase()), {
      message: 'Invalid ISO 3166-1 alpha-3 country code',
    }),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  emissionsTarget: z
    .number()
    .positive('Emissions target must be positive')
    .max(9999999.99, 'Emissions target must be less than 10,000,000 tons CO2e'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
  estimatedCompletionDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
    .optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  contactInfo: z
    .object({
      projectManagerName: z.string().min(1, 'Project manager name is required'),
      projectManagerEmail: z.string().email('Invalid email format'),
      organizationName: z.string().min(1, 'Organization name is required'),
      organizationEmail: z.string().email('Invalid email format'),
    })
    .optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

// Update project request schema
export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.nativeEnum(ProjectType).optional(),
  description: z.string().min(50).optional(),
  location: z.string().min(1).max(255).optional(),
  country: z
    .string()
    .length(3)
    .refine((code) => ISO_3166_1_ALPHA_3_CODES.includes(code.toUpperCase()), {
      message: 'Invalid ISO 3166-1 alpha-3 country code',
    })
    .optional(),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  emissionsTarget: z.number().positive().max(9999999.99).optional(),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
    .optional(),
});

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

// Project response interfaces
export interface ProjectResponse {
  status: string;
  data: {
    project: {
      id: string;
      developerId: string;
      title: string;
      type: ProjectType;
      description: string;
      location: string;
      country: string;
      coordinates: { latitude: number; longitude: number } | null;
      emissionsTarget: number;
      startDate: string;
      status: ProjectStatus;
      imageUrl?: string | null;
      estimatedCompletionDate?: string | null;
      contactInfo?: {
        projectManagerName: string;
        projectManagerEmail: string;
        organizationName: string;
        organizationEmail: string;
      } | null;
      createdAt: string;
      updatedAt: string;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProjectListResponse {
  status: string;
  data: {
    projects: Array<{
      id: string;
      developerId: string;
      title: string;
      type: ProjectType;
      description: string;
      location: string;
      country: string;
      coordinates: { latitude: number; longitude: number } | null;
      emissionsTarget: number;
      startDate: string;
      status: ProjectStatus;
      imageUrl?: string | null;
      estimatedCompletionDate?: string | null;
      contactInfo?: {
        projectManagerName: string;
        projectManagerEmail: string;
        organizationName: string;
        organizationEmail: string;
      } | null;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      cursor: string | null;
      hasMore: boolean;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
