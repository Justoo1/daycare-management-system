import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, StaffPermission, DEFAULT_PERMISSIONS_BY_ROLE } from '@shared';

/**
 * Role-based access control middleware
 * Checks if the user has the required role(s) to access a route
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - No user found',
        timestamp: new Date().toISOString(),
      });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesArray.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden - Required role(s): ${rolesArray.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Get user's effective permissions
 * Uses custom permissions if set, otherwise falls back to default role permissions
 */
export function getEffectivePermissions(
  role: UserRole,
  customPermissions?: string[] | null,
  useCustomPermissions?: boolean
): string[] {
  // Super admin and center owner always have all permissions
  if (role === UserRole.SUPER_ADMIN || role === UserRole.CENTER_OWNER) {
    return Object.values(StaffPermission);
  }

  // If custom permissions are enabled and set, use them
  if (useCustomPermissions && customPermissions && customPermissions.length > 0) {
    return customPermissions;
  }

  // Otherwise, use default permissions for the role
  return DEFAULT_PERMISSIONS_BY_ROLE[role] || [];
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: StaffPermission,
  customPermissions?: string[] | null,
  useCustomPermissions?: boolean
): boolean {
  const effectivePermissions = getEffectivePermissions(role, customPermissions, useCustomPermissions);
  return effectivePermissions.includes(permission);
}

/**
 * Permission-based access control middleware
 * Checks if the user has the required permission(s) to access a route
 */
export function requirePermission(requiredPermissions: StaffPermission | StaffPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const tenant = (request as any).tenant;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - No user found',
        timestamp: new Date().toISOString(),
      });
    }

    // Parents have their own access control (not permission-based)
    if (user.role === UserRole.PARENT) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden - This resource is not accessible to parents',
        timestamp: new Date().toISOString(),
      });
    }

    const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Get user's effective permissions from tenant context
    const userPermissions = tenant?.permissions || getEffectivePermissions(user.role, null, false);

    // Check if user has ALL required permissions
    const hasAllPermissions = permissionsArray.every(perm => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden - Required permission(s): ${permissionsArray.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Permission check middleware - requires ANY of the specified permissions
 */
export function requireAnyPermission(requiredPermissions: StaffPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const tenant = (request as any).tenant;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - No user found',
        timestamp: new Date().toISOString(),
      });
    }

    // Parents have their own access control
    if (user.role === UserRole.PARENT) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden - This resource is not accessible to parents',
        timestamp: new Date().toISOString(),
      });
    }

    const userPermissions = tenant?.permissions || getEffectivePermissions(user.role, null, false);

    // Check if user has ANY of the required permissions
    const hasAnyPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasAnyPermission) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden - Required at least one of: ${requiredPermissions.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware to ensure only parents can access certain routes
 */
export const requireParentRole = requireRole(UserRole.PARENT);

/**
 * Middleware to ensure only managers (SUPER_ADMIN, CENTER_OWNER, DIRECTOR) can access
 */
export const requireManagerRole = requireRole([
  UserRole.SUPER_ADMIN,
  UserRole.CENTER_OWNER,
  UserRole.DIRECTOR,
]);

/**
 * Middleware to ensure only staff (SUPER_ADMIN, CENTER_OWNER, DIRECTOR, TEACHER, STAFF) can access
 */
export const requireStaffRole = requireRole([
  UserRole.SUPER_ADMIN,
  UserRole.CENTER_OWNER,
  UserRole.DIRECTOR,
  UserRole.TEACHER,
  UserRole.STAFF,
]);

/**
 * Middleware to ensure parent can only access their own children's data
 * Validates that the childId in the request matches one of the children linked to the parent
 */
export async function validateParentChildAccess(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;

  // Only apply this check to PARENT role
  if (user.role !== UserRole.PARENT) {
    return; // Allow non-parent roles to proceed
  }

  // Extract childId from params or body
  const params = request.params as any;
  const body = request.body as any;
  const childId = params?.childId || body?.childId;

  if (!childId) {
    // If no childId in request, skip validation (e.g., for listing own children)
    return;
  }

  // Import GuardianService to check if parent has access to this child
  const { getGuardianService } = await import('@services/GuardianService');
  const guardianService = getGuardianService();
  const tenant = (request as any).tenant;

  try {
    const children = await guardianService.getChildrenForParent(tenant.tenantId, user.id);
    const hasAccess = children.some(child => child.id === childId);

    if (!hasAccess) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden - You do not have access to this child',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to validate access',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Combined middleware for parent routes that require both PARENT role and child access validation
 */
export const requireParentWithChildAccess = [requireParentRole, validateParentChildAccess];
