/**
 * Row-Level Security Helpers
 *
 * Provides query filters for user-owned resources based on role-based access control.
 * Implements requirements 8.2, 8.5, 8.6 for row-level security.
 *
 * These helpers ensure that:
 * - Developers can only access their own projects (Req 8.2)
 * - Verifiers can only access assigned verifications (Req 8.5, 8.6)
 * - Users can only access their own credits (Req 8.9)
 * - Administrators have full access to all resources
 */

import { UserRole } from '../domain/entities/User';

/**
 * Query filter interface for building WHERE clauses
 */
export interface QueryFilter {
  clause: string;
  params: any[];
}

/**
 * Options for building row-level security filters
 */
export interface RowSecurityOptions {
  userId: string;
  role: UserRole;
  paramOffset?: number; // For parameterized queries starting at a specific index
}

/**
 * Developer project access filter
 *
 * Requirement 8.2: Developers can only view their own projects
 * Administrators can view all projects
 * Buyers can only view verified projects
 *
 * @param options - User ID and role information
 * @returns Query filter with WHERE clause and parameters
 */
export function buildProjectAccessFilter(options: RowSecurityOptions): QueryFilter {
  const { userId, role, paramOffset = 1 } = options;

  // Administrators can access all projects
  if (role === UserRole.ADMINISTRATOR) {
    return {
      clause: '1=1', // No restriction
      params: [],
    };
  }

  // Developers can only access their own projects
  if (role === UserRole.DEVELOPER) {
    return {
      clause: `developer_id = $${paramOffset}`,
      params: [userId],
    };
  }

  // Buyers can only view verified projects
  if (role === UserRole.BUYER) {
    return {
      clause: `status = $${paramOffset}`,
      params: ['verified'],
    };
  }

  // Verifiers can view projects under verification
  if (role === UserRole.VERIFIER) {
    return {
      clause: `status IN ($${paramOffset}, $${paramOffset + 1})`,
      params: ['pending', 'verified'],
    };
  }

  // Default: no access
  return {
    clause: '1=0', // Always false
    params: [],
  };
}

/**
 * Verifier verification access filter
 *
 * Requirements 8.5, 8.6: Verifiers can only view assigned verifications
 * Administrators can view all verifications
 * Developers can view verifications for their own projects
 *
 * @param options - User ID and role information
 * @returns Query filter with WHERE clause and parameters
 */
export function buildVerificationAccessFilter(options: RowSecurityOptions): QueryFilter {
  const { userId, role, paramOffset = 1 } = options;

  // Administrators can access all verifications
  if (role === UserRole.ADMINISTRATOR) {
    return {
      clause: '1=1', // No restriction
      params: [],
    };
  }

  // Verifiers can only access assigned verifications
  if (role === UserRole.VERIFIER) {
    return {
      clause: `verifier_id = $${paramOffset}`,
      params: [userId],
    };
  }

  // Developers can view verifications for their own projects
  if (role === UserRole.DEVELOPER) {
    return {
      clause: `developer_id = $${paramOffset}`,
      params: [userId],
    };
  }

  // Default: no access for buyers and others
  return {
    clause: '1=0', // Always false
    params: [],
  };
}

/**
 * Credit ownership filter
 *
 * Requirement 8.9: Users can only access their own credits
 * Administrators can access all credits
 *
 * @param options - User ID and role information
 * @returns Query filter with WHERE clause and parameters
 */
export function buildCreditOwnershipFilter(options: RowSecurityOptions): QueryFilter {
  const { userId, role, paramOffset = 1 } = options;

  // Administrators can access all credits
  if (role === UserRole.ADMINISTRATOR) {
    return {
      clause: '1=1', // No restriction
      params: [],
    };
  }

  // All other users can only access their own credits
  return {
    clause: `owner_id = $${paramOffset}`,
    params: [userId],
  };
}

/**
 * Generic resource ownership filter
 *
 * Checks if user owns a resource based on various ownership fields
 * Useful for checking access to individual resources
 *
 * @param userId - User ID to check
 * @param role - User role
 * @param resource - Resource with ownership fields
 * @returns True if user can access the resource
 */
export interface ResourceOwnership {
  ownerId?: string | null;
  developerId?: string | null;
  verifierId?: string | null;
}

export function canAccessResource(
  userId: string,
  role: UserRole,
  resource: ResourceOwnership
): boolean {
  // Administrators can access all resources
  if (role === UserRole.ADMINISTRATOR) {
    return true;
  }

  // Check if user owns the resource through any ownership field
  if (resource.ownerId === userId) {
    return true;
  }

  if (resource.developerId === userId) {
    return true;
  }

  if (resource.verifierId === userId) {
    return true;
  }

  return false;
}

/**
 * Build combined filter for complex queries
 *
 * Combines multiple filters with AND logic
 *
 * @param filters - Array of query filters
 * @returns Combined query filter
 */
export function combineFilters(filters: QueryFilter[]): QueryFilter {
  const clauses = filters.map((f) => f.clause).filter((c) => c !== '1=1');
  const params = filters.flatMap((f) => f.params);

  if (clauses.length === 0) {
    return {
      clause: '1=1',
      params: [],
    };
  }

  return {
    clause: clauses.map((c) => `(${c})`).join(' AND '),
    params,
  };
}

/**
 * Adjust parameter indices in a query filter
 *
 * Useful when combining filters or adding to existing queries
 *
 * @param filter - Query filter to adjust
 * @param offset - Offset to add to parameter indices
 * @returns Adjusted query filter
 */
export function adjustParameterIndices(filter: QueryFilter, offset: number): QueryFilter {
  if (offset === 0 || filter.params.length === 0) {
    return filter;
  }

  // Replace $1, $2, etc. with adjusted indices
  let adjustedClause = filter.clause;
  for (let i = filter.params.length; i >= 1; i--) {
    const oldParam = `$${i}`;
    const newParam = `$${i + offset}`;
    adjustedClause = adjustedClause.replace(new RegExp(`\\${oldParam}\\b`, 'g'), newParam);
  }

  return {
    clause: adjustedClause,
    params: filter.params,
  };
}
