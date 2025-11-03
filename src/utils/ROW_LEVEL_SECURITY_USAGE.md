# Row-Level Security Helpers - Usage Guide

This document explains how to use the row-level security helpers to implement proper access control in repository queries.

## Overview

The row-level security helpers provide query filters that ensure users can only access resources they own or are authorized to view, based on their role. This implements requirements 8.2, 8.5, and 8.6.

## Key Concepts

### Query Filters

A `QueryFilter` contains:
- `clause`: SQL WHERE clause fragment (e.g., `"developer_id = $1"`)
- `params`: Array of parameter values to bind to the query

### Row Security Options

When building filters, you provide:
- `userId`: The current user's ID
- `role`: The current user's role (from `UserRole` enum)
- `paramOffset`: (optional) Starting parameter index for parameterized queries

## Available Filters

### 1. Project Access Filter

Controls which projects a user can view based on their role.

```typescript
import { buildProjectAccessFilter } from '../utils/rowLevelSecurity';
import { UserRole } from '../domain/entities/User';

// Example: Developer viewing their projects
const filter = buildProjectAccessFilter({
  userId: currentUser.id,
  role: currentUser.role,
});

const query = `
  SELECT * FROM projects
  WHERE ${filter.clause}
  ORDER BY created_at DESC
`;

const result = await pool.query(query, filter.params);
```

**Access Rules:**
- **Administrators**: Can view all projects
- **Developers**: Can only view their own projects (Req 8.2)
- **Buyers**: Can only view verified projects
- **Verifiers**: Can view pending and verified projects

### 2. Verification Access Filter

Controls which verification requests a user can view.

```typescript
import { buildVerificationAccessFilter } from '../utils/rowLevelSecurity';

// Example: Verifier viewing assigned verifications
const filter = buildVerificationAccessFilter({
  userId: currentUser.id,
  role: currentUser.role,
});

const query = `
  SELECT * FROM verification_requests
  WHERE ${filter.clause}
  ORDER BY submitted_at DESC
`;

const result = await pool.query(query, filter.params);
```

**Access Rules:**
- **Administrators**: Can view all verifications
- **Verifiers**: Can only view assigned verifications (Req 8.5, 8.6)
- **Developers**: Can view verifications for their own projects
- **Buyers**: No access

### 3. Credit Ownership Filter

Controls which credits a user can view.

```typescript
import { buildCreditOwnershipFilter } from '../utils/rowLevelSecurity';

// Example: User viewing their credits
const filter = buildCreditOwnershipFilter({
  userId: currentUser.id,
  role: currentUser.role,
});

const query = `
  SELECT * FROM credit_entries
  WHERE ${filter.clause}
  ORDER BY issued_at DESC
`;

const result = await pool.query(query, filter.params);
```

**Access Rules:**
- **Administrators**: Can view all credits
- **All other roles**: Can only view their own credits

## Advanced Usage

### Combining Filters

Combine multiple filters for complex queries:

```typescript
import { buildProjectAccessFilter, combineFilters } from '../utils/rowLevelSecurity';

// Security filter based on user role
const securityFilter = buildProjectAccessFilter({
  userId: currentUser.id,
  role: currentUser.role,
});

// Additional business logic filter
const statusFilter = {
  clause: 'status = $2',
  params: ['verified'],
};

// Combine both filters
const combined = combineFilters([securityFilter, statusFilter]);

const query = `
  SELECT * FROM projects
  WHERE ${combined.clause}
  ORDER BY created_at DESC
`;

const result = await pool.query(query, combined.params);
```

### Parameter Offset

When adding filters to existing queries with parameters:

```typescript
import { buildProjectAccessFilter } from '../utils/rowLevelSecurity';

// Existing query has 2 parameters
const projectType = 'renewable_energy';
const country = 'US';

// Start security filter parameters at $3
const filter = buildProjectAccessFilter({
  userId: currentUser.id,
  role: currentUser.role,
  paramOffset: 3, // Start at $3 instead of $1
});

const query = `
  SELECT * FROM projects
  WHERE type = $1 AND country = $2 AND ${filter.clause}
  ORDER BY created_at DESC
`;

const params = [projectType, country, ...filter.params];
const result = await pool.query(query, params);
```

### Adjusting Parameter Indices

Adjust parameter indices when combining filters:

```typescript
import { adjustParameterIndices, combineFilters } from '../utils/rowLevelSecurity';

const filter1 = {
  clause: 'status = $1',
  params: ['active'],
};

// Adjust filter2 to start at $2
const filter2 = adjustParameterIndices(
  {
    clause: 'owner_id = $1',
    params: [userId],
  },
  1 // Offset by 1
);

const combined = combineFilters([filter1, filter2]);
// Result: "status = $1 AND owner_id = $2"
```

### Checking Individual Resource Access

Check if a user can access a specific resource:

```typescript
import { canAccessResource } from '../utils/rowLevelSecurity';

// Fetch a project
const project = await projectRepository.findById(projectId);

// Check if current user can access it
const hasAccess = canAccessResource(
  currentUser.id,
  currentUser.role,
  {
    developerId: project.developerId,
  }
);

if (!hasAccess) {
  throw new Error('Access denied');
}
```

## Repository Implementation Examples

### Project Repository

```typescript
import { buildProjectAccessFilter } from '../utils/rowLevelSecurity';

export class ProjectRepository {
  async findByUser(userId: string, role: UserRole, pagination: Pagination): Promise<Project[]> {
    const filter = buildProjectAccessFilter({ userId, role });

    const query = `
      SELECT * FROM projects
      WHERE ${filter.clause}
      ORDER BY created_at DESC
      LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}
    `;

    const params = [...filter.params, pagination.limit, pagination.offset];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findById(id: string, userId: string, role: UserRole): Promise<Project | null> {
    const filter = buildProjectAccessFilter({ userId, role, paramOffset: 2 });

    const query = `
      SELECT * FROM projects
      WHERE id = $1 AND ${filter.clause}
    `;

    const params = [id, ...filter.params];
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }
}
```

### Verification Repository

```typescript
import { buildVerificationAccessFilter } from '../utils/rowLevelSecurity';

export class VerificationRepository {
  async findByUser(userId: string, role: UserRole): Promise<VerificationRequest[]> {
    const filter = buildVerificationAccessFilter({ userId, role });

    const query = `
      SELECT * FROM verification_requests
      WHERE ${filter.clause}
      ORDER BY submitted_at DESC
    `;

    const result = await this.pool.query(query, filter.params);
    return result.rows;
  }

  async findById(id: string, userId: string, role: UserRole): Promise<VerificationRequest | null> {
    const filter = buildVerificationAccessFilter({ userId, role, paramOffset: 2 });

    const query = `
      SELECT * FROM verification_requests
      WHERE id = $1 AND ${filter.clause}
    `;

    const params = [id, ...filter.params];
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }
}
```

### Credit Repository

```typescript
import { buildCreditOwnershipFilter } from '../utils/rowLevelSecurity';

export class CreditRepository {
  async findByUser(userId: string, role: UserRole): Promise<CreditEntry[]> {
    const filter = buildCreditOwnershipFilter({ userId, role });

    const query = `
      SELECT * FROM credit_entries
      WHERE ${filter.clause}
      ORDER BY issued_at DESC
    `;

    const result = await this.pool.query(query, filter.params);
    return result.rows;
  }

  async findById(id: string, userId: string, role: UserRole): Promise<CreditEntry | null> {
    const filter = buildCreditOwnershipFilter({ userId, role, paramOffset: 2 });

    const query = `
      SELECT * FROM credit_entries
      WHERE id = $1 AND ${filter.clause}
    `;

    const params = [id, ...filter.params];
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }
}
```

## Security Best Practices

1. **Always apply row-level security filters** in repository methods that return multiple records
2. **Apply filters even for single record lookups** to prevent unauthorized access
3. **Use parameterized queries** to prevent SQL injection
4. **Test with different user roles** to ensure proper access control
5. **Log access denials** for security auditing
6. **Never trust client-provided filters** - always apply server-side security filters

## Testing

Test your repository methods with different user roles:

```typescript
describe('ProjectRepository', () => {
  it('should only return developer\'s own projects', async () => {
    const developer = await createTestUser(UserRole.DEVELOPER);
    const otherDeveloper = await createTestUser(UserRole.DEVELOPER);

    await createTestProject({ developerId: developer.id });
    await createTestProject({ developerId: otherDeveloper.id });

    const projects = await projectRepository.findByUser(developer.id, developer.role);

    expect(projects).toHaveLength(1);
    expect(projects[0].developerId).toBe(developer.id);
  });

  it('should allow administrators to view all projects', async () => {
    const admin = await createTestUser(UserRole.ADMINISTRATOR);
    const developer = await createTestUser(UserRole.DEVELOPER);

    await createTestProject({ developerId: developer.id });
    await createTestProject({ developerId: developer.id });

    const projects = await projectRepository.findByUser(admin.id, admin.role);

    expect(projects).toHaveLength(2);
  });
});
```

## Requirements Mapping

- **Requirement 8.2**: Developers can only view their own projects
  - Implemented by `buildProjectAccessFilter`
  
- **Requirement 8.5**: Verifiers can only view assigned verifications
  - Implemented by `buildVerificationAccessFilter`
  
- **Requirement 8.6**: Verifiers can only approve assigned verifications
  - Implemented by `buildVerificationAccessFilter` + `canAccessResource`

## Troubleshooting

### Issue: Parameters not binding correctly

**Problem**: Query fails with "bind message supplies 2 parameters, but prepared statement requires 3"

**Solution**: Check parameter offset and ensure all filter parameters are included:

```typescript
// Wrong
const query = `SELECT * FROM projects WHERE type = $1 AND ${filter.clause}`;
const params = [projectType]; // Missing filter.params!

// Correct
const query = `SELECT * FROM projects WHERE type = $1 AND ${filter.clause}`;
const params = [projectType, ...filter.params];
```

### Issue: Administrator sees no results

**Problem**: Administrator filter returns `1=1` but query returns empty results

**Solution**: Check if there are other restrictive filters being applied:

```typescript
// This will return no results even for admins
const filter = buildProjectAccessFilter({ userId, role: UserRole.ADMINISTRATOR });
// filter.clause = '1=1' (no restriction)

const query = `SELECT * FROM projects WHERE ${filter.clause} AND 1=0`; // Always false!
```

### Issue: User can access other users' resources

**Problem**: Row-level security not being applied

**Solution**: Ensure you're calling the filter functions in all repository methods:

```typescript
// Wrong - no security filter
async findAll(): Promise<Project[]> {
  const query = 'SELECT * FROM projects';
  return await this.pool.query(query);
}

// Correct - with security filter
async findAll(userId: string, role: UserRole): Promise<Project[]> {
  const filter = buildProjectAccessFilter({ userId, role });
  const query = `SELECT * FROM projects WHERE ${filter.clause}`;
  return await this.pool.query(query, filter.params);
}
```
