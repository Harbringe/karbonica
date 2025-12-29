export enum ProjectType {
  FOREST_CONSERVATION = 'forest_conservation',
  RENEWABLE_ENERGY = 'renewable_energy',
  ENERGY_EFFICIENCY = 'energy_efficiency',
  METHANE_CAPTURE = 'methane_capture',
  SOIL_CARBON = 'soil_carbon',
  OCEAN_CONSERVATION = 'ocean_conservation',
  DIRECT_AIR_CAPTURE = 'direct_air_capture',
}

export enum ProjectStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export interface ProjectContactInfo {
  projectManagerName: string;
  projectManagerEmail: string;
  organizationName: string;
  organizationEmail: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  url: string;
  type: string; // e.g., 'pdf', 'doc', 'image'
  size: number; // in bytes
  uploadedAt: Date;
}

export interface Project {
  id: string;
  developerId: string;
  title: string;
  type: ProjectType;
  description: string;
  location: string;
  country: string; // ISO 3166-1 alpha-3 code
  coordinates: { latitude: number; longitude: number } | null;
  emissionsTarget: number; // in tons CO2e
  startDate: Date;
  estimatedCompletionDate?: Date | null; // When the project is expected to complete
  status: ProjectStatus;
  imageUrl?: string | null; // Project thumbnail image
  documents?: ProjectDocument[]; // Supporting documents
  contactInfo?: ProjectContactInfo | null; // Project manager and organization info
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  developerId: string;
  title: string;
  type: ProjectType;
  description: string;
  location: string;
  country: string;
  coordinates?: { latitude: number; longitude: number };
  emissionsTarget: number;
  startDate: Date;
  estimatedCompletionDate?: Date;
  imageUrl?: string;
  contactInfo?: ProjectContactInfo;
}

export interface UpdateProjectData {
  title?: string;
  type?: ProjectType;
  description?: string;
  location?: string;
  country?: string;
  coordinates?: { latitude: number; longitude: number };
  emissionsTarget?: number;
  startDate?: Date;
  estimatedCompletionDate?: Date;
  imageUrl?: string;
  contactInfo?: ProjectContactInfo;
}
