import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@config/environment';
import { TenantContext } from '@shared';

/**
 * Multi-tenant middleware
 * Extracts tenant ID from request header and attaches it to the request
 */
export async function tenantMiddleware(
  fastify: FastifyInstance,
  options: unknown
) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip tenant validation for public routes
    const publicRoutes = [
      '/health',
      '/api/version',
      '/api/tenants/register',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/login/otp/send',
      '/api/auth/login/otp/verify',
      '/documentation',
    ];

    // Also skip for tenant lookup routes (by ID or slug) and Swagger routes
    const publicRoutePatterns = [
      /^\/api\/tenants\/[^/]+$/,
      /^\/api\/tenants\/slug\/[^/]+$/,
      /^\/documentation/,
    ];

    if (publicRoutes.includes(request.url) || publicRoutePatterns.some(pattern => pattern.test(request.url))) {
      return;
    }

    // For authenticated routes, tenant context will be set by authenticateRoute middleware from JWT
    // So we only require x-tenant-id header for routes that don't use JWT authentication
    const tenantId = request.headers[config.tenant.headerName] as string;

    // If no tenant ID in header and no tenant set by auth middleware, return error
    if (!tenantId && !(request as any).tenant) {
      return reply.status(400).send({
        success: false,
        error: 'Missing tenant ID in request headers or JWT token',
        timestamp: new Date().toISOString(),
      });
    }

    // Only set tenant from header if not already set by auth middleware
    if (tenantId && !(request as any).tenant) {
      // Validate tenant ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid tenant ID format',
          timestamp: new Date().toISOString(),
        });
      }

      // Attach tenant context to request
      (request as any).tenant = {
        tenantId,
      } as TenantContext;
    }
  });
}

/**
 * Authentication middleware
 * Extracts JWT token and validates it
 */
export async function authMiddleware(
  fastify: FastifyInstance,
  options: unknown
) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

/**
 * Rate limiting middleware decorator
 * Can be used per route to apply rate limiting
 */
export function rateLimit(options: { max: number; windowMs: number }) {
  return async (fastify: FastifyInstance) => {
    // Implementation would go here
    // Could use fastify-rate-limit plugin
  };
}

export default tenantMiddleware;
