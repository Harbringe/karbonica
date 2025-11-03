# Authorization Middleware Usage Guide

This guide explains how to use the authorization middleware in the Karbonica Carbon Credit Registry Platform.

## Overview

The authorization system implements role-based access control (RBAC) based on Requirements 8.1-8.11. It provides:

- **Permission-based authorization**: Check if a user's role has permission to perform an action on a resource
- **Role-based authorization**: Require specific roles for endpoints
- **Row-level security helpers**: Check if a user owns or has access to specific resources

## User Roles

The system supports four user roles:

- `DEVELOPER`: Creates and manages carbon offset projects
- `VERIFIER`: Reviews and approves/rejects verification requests
- `ADMINISTRATOR`: Full system access, can perform any action
- `BUYER`: Purchases and retires carbon credits

## Middleware Functions

### 1. `authorize(resource, action)`

Checks if the authenticated user has permission to perform an action on a resource.

**Example:**

```typescript
import { authenticate, authorize, Resource, Action } from '../middleware';

// Only developers can create projects
router.post(
  '/api/v1/projects',
  authenticate,
  authorize(Resource.PROJECT, Action.CREATE),
  projectController.create
);

// Only verifiers and administrators can approve verifications
router.post(
  '/api/v1/verifications/:id/approve',
  authenticate,
  authorize(Resource.VERIFICATION, Action.APPROVE),
  verificationController.approve
);

// Only administrators can read audit logs
router.get(
  '/api/v1/audit-logs',
  authenticate,
  authorize(Resource.AUDIT_LOG, Action.READ),
  auditController.list
);
```

### 2. `requireRole(...roles)`

Requires the user to have one of the specified roles.

**Example:**

```typescript
import { authenticate, requireRole, UserRole } from '../middleware';

// Only administrators can access this endpoint
router.post(
  '/api/v1/verifications/:id/assign',
  authenticate,
  requireRole(UserRole.ADMINISTRATOR),
  verificationController.assign
);

// Either verifiers or administrators can access
router.get(
  '/api/v1/verifications',
  authenticate,
  requireRole(UserRole.VERIFIER, UserRole.ADMINISTRATOR),
  verificationController.list
);
```

### 3. Convenience Role Middleware

Pre-configured middleware for common role checks:

```typescript
import {
  authenticate,
  requireAdmin,
  requireDeveloper,
  requireVerifier,
  requireBuyer,
  requireVerifierOrAdmin,
} from '../middleware';

// Administrator only
router.delete('/api/v1/users/:id', authenticate, requireAdmin, userController.delete);

// Developer only
router.post('/api/v1/projects', authenticate, requireDeveloper, projectController.create);

// Verifier or Administrator
router.post(
  '/api/v1/verifications/:id/approve',
  authenticate,
  requireVerifierOrAdmin,
  verificationController.approve
);
```

## Resources and Actions

### Available Resources

```typescript
enum Resource {
  PROJECT = 'project',
  VERIFICATION = 'verification',
  CREDIT = 'credit',
  USER = 'user',
  AUDIT_LOG = 'audit_log',
  WALLET = 'wallet',
}
```

### Available Actions

```typescript
enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  TRANSFER = 'transfer',
  RETIRE = 'retire',
  LINK = 'link',
  UNLINK = 'unlink',
}
```

## Permission Matrix

| Role          | Projects                     | Verifications                         | Credits                                | Audit Logs | Wallets            |
| ------------- | ---------------------------- | ------------------------------------- | -------------------------------------- | ---------- | ------------------ |
| Developer     | Create, Read, Update, Delete | Read (own only)                       | Read, Transfer, Retire                 | None       | Link, Unlink, Read |
| Verifier      | Read                         | Read, Update, Approve, Reject         | Read                                   | None       | Link, Unlink, Read |
| Administrator | Create, Read, Update, Delete | Read, Update, Approve, Reject, Assign | Create, Read, Update, Transfer, Retire | Read       | Link, Unlink, Read |
| Buyer         | Read (verified only)         | None                                  | Read, Transfer, Retire                 | None       | Link, Unlink, Read |

## Row-Level Security

For checking if a user owns or has access to a specific resource:

```typescript
import { canAccessOwnResource } from '../middleware/permissions';

// In your controller
async function getProject(req: Request, res: Response) {
  const project = await projectRepository.findById(req.params.id);

  // Check if user can access this specific project
  if (!canAccessOwnResource(req.user!.id, req.user!.role as UserRole, {
    developerId: project.developerId,
  })) {
    throw new AuthorizationError('You do not have access to this project');
  }

  res.json(project);
}
```

## Error Handling

Authorization failures return a 403 Forbidden response:

```json
{
  "status": "error",
  "code": "AUTHORIZATION_ERROR",
  "title": "AuthorizationError",
  "detail": "Role 'developer' does not have permission to 'approve' on 'verification'",
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123"
  }
}
```

## Complete Example

```typescript
import express from 'express';
import {
  authenticate,
  authorize,
  requireAdmin,
  requireVerifierOrAdmin,
  Resource,
  Action,
} from '../middleware';
import { projectController } from '../controllers/projectController';

const router = express.Router();

// Public endpoint - no authentication required
router.get('/api/v1/projects/public', projectController.listPublic);

// Authenticated users can read projects
router.get(
  '/api/v1/projects',
  authenticate,
  authorize(Resource.PROJECT, Action.READ),
  projectController.list
);

// Only developers can create projects
router.post(
  '/api/v1/projects',
  authenticate,
  authorize(Resource.PROJECT, Action.CREATE),
  projectController.create
);

// Only developers can update their own projects (row-level security in controller)
router.patch(
  '/api/v1/projects/:id',
  authenticate,
  authorize(Resource.PROJECT, Action.UPDATE),
  projectController.update
);

// Only administrators can delete projects
router.delete(
  '/api/v1/projects/:id',
  authenticate,
  requireAdmin,
  projectController.delete
);

// Verifiers and administrators can approve verifications
router.post(
  '/api/v1/verifications/:id/approve',
  authenticate,
  requireVerifierOrAdmin,
  verificationController.approve
);

export default router;
```

## Testing Authorization

```typescript
import { describe, it, expect } from 'vitest';
import { hasPermission } from '../middleware/permissions';
import { UserRole, Resource, Action } from '../middleware';

describe('Authorization', () => {
  it('should allow developer to create project', () => {
    expect(hasPermission(UserRole.DEVELOPER, Resource.PROJECT, Action.CREATE)).toBe(true);
  });

  it('should deny developer from approving verification', () => {
    expect(hasPermission(UserRole.DEVELOPER, Resource.VERIFICATION, Action.APPROVE)).toBe(false);
  });
});
```

## Best Practices

1. **Always authenticate first**: Use `authenticate` middleware before authorization checks
2. **Use specific permissions**: Prefer `authorize(Resource, Action)` over `requireRole` when possible
3. **Implement row-level security**: Check resource ownership in controllers for user-specific data
4. **Log authorization failures**: The middleware automatically logs failed authorization attempts
5. **Test permissions**: Write tests for all authorization rules
6. **Document role requirements**: Clearly document which roles can access each endpoint

## Audit Logging

All authorization failures are automatically logged with:

- User ID and email
- Requested resource and action
- User's role
- Request path and method
- Timestamp

These logs can be queried for security audits and compliance reporting.
