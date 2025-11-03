import { ProjectType } from '../domain/entities/Project';
import { validateCountryCode } from './countryValidation';

/**
 * Validates emissions target
 * @param emissionsTarget - The emissions target in tons CO2e
 * @throws Error if validation fails
 */
export const validateEmissionsTarget = (emissionsTarget: number): void => {
  if (typeof emissionsTarget !== 'number' || isNaN(emissionsTarget)) {
    throw new Error('Emissions target must be a valid number');
  }

  if (emissionsTarget <= 0) {
    throw new Error('Emissions target must be a positive number');
  }

  if (emissionsTarget >= 10000000) {
    throw new Error('Emissions target must be less than 10,000,000 tons CO2e');
  }
};

/**
 * Validates project type
 * @param type - The project type
 * @throws Error if validation fails
 */
export const validateProjectType = (type: string): void => {
  const validTypes = Object.values(ProjectType);

  if (!validTypes.includes(type as ProjectType)) {
    throw new Error(`Invalid project type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }
};

/**
 * Validates project title
 * @param title - The project title
 * @throws Error if validation fails
 */
export const validateProjectTitle = (title: string): void => {
  if (!title || typeof title !== 'string') {
    throw new Error('Project title is required');
  }

  if (title.trim().length === 0) {
    throw new Error('Project title cannot be empty');
  }

  if (title.length > 200) {
    throw new Error('Project title must not exceed 200 characters');
  }
};

/**
 * Validates project description
 * @param description - The project description
 * @throws Error if validation fails
 */
export const validateProjectDescription = (description: string): void => {
  if (!description || typeof description !== 'string') {
    throw new Error('Project description is required');
  }

  if (description.trim().length === 0) {
    throw new Error('Project description cannot be empty');
  }

  if (description.length < 50) {
    throw new Error('Project description must be at least 50 characters');
  }
};

/**
 * Validates project location
 * @param location - The project location
 * @throws Error if validation fails
 */
export const validateProjectLocation = (location: string): void => {
  if (!location || typeof location !== 'string') {
    throw new Error('Project location is required');
  }

  if (location.trim().length === 0) {
    throw new Error('Project location cannot be empty');
  }

  if (location.length > 255) {
    throw new Error('Project location must not exceed 255 characters');
  }
};

/**
 * Validates coordinates
 * @param coordinates - The coordinates object
 * @throws Error if validation fails
 */
export const validateCoordinates = (coordinates?: {
  latitude: number;
  longitude: number;
}): void => {
  if (!coordinates) {
    return; // Coordinates are optional
  }

  if (typeof coordinates.latitude !== 'number' || isNaN(coordinates.latitude)) {
    throw new Error('Latitude must be a valid number');
  }

  if (typeof coordinates.longitude !== 'number' || isNaN(coordinates.longitude)) {
    throw new Error('Longitude must be a valid number');
  }

  if (coordinates.latitude < -90 || coordinates.latitude > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }

  if (coordinates.longitude < -180 || coordinates.longitude > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }
};

/**
 * Validates start date
 * @param startDate - The project start date
 * @throws Error if validation fails
 */
export const validateStartDate = (startDate: Date): void => {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('Start date must be a valid date');
  }

  // Start date should not be too far in the past (e.g., before 1990)
  const minDate = new Date('1990-01-01');
  if (startDate < minDate) {
    throw new Error('Start date cannot be before 1990');
  }

  // Start date should not be too far in the future (e.g., more than 10 years)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  if (startDate > maxDate) {
    throw new Error('Start date cannot be more than 10 years in the future');
  }
};

/**
 * Validates all project data
 * @param data - The project data to validate
 * @throws Error if any validation fails
 */
export const validateProjectData = (data: {
  title: string;
  type: string;
  description: string;
  location: string;
  country: string;
  emissionsTarget: number;
  startDate: Date;
  coordinates?: { latitude: number; longitude: number };
}): void => {
  validateProjectTitle(data.title);
  validateProjectType(data.type);
  validateProjectDescription(data.description);
  validateProjectLocation(data.location);
  validateCountryCode(data.country);
  validateEmissionsTarget(data.emissionsTarget);
  validateStartDate(data.startDate);
  validateCoordinates(data.coordinates);
};
