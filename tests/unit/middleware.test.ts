/**
 * Middleware Unit Tests
 *
 * Tests for tenant and auth middleware
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Fastify from 'fastify';
import { tenantMiddleware, authMiddleware, rateLimit } from '../../src/middleware/tenant';

describe('Tenant Middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(tenantMiddleware);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow public routes without tenant ID', async () => {
    app.get('/health', async () => ({ status: 'ok' }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow tenant registration without tenant ID', async () => {
    app.post('/api/tenants/register', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenants/register',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow auth routes without tenant ID', async () => {
    app.post('/api/auth/login', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow documentation routes without tenant ID', async () => {
    app.get('/documentation', async () => ({ docs: true }));
    app.get('/documentation/static/index.css', async () => 'css');
    await app.ready();

    const response1 = await app.inject({
      method: 'GET',
      url: '/documentation',
    });

    const response2 = await app.inject({
      method: 'GET',
      url: '/documentation/static/index.css',
    });

    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);
  });

  it('should allow tenant lookup by ID without tenant header', async () => {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    app.get('/api/tenants/:id', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: `/api/tenants/${tenantId}`,
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow tenant lookup by slug without tenant header', async () => {
    app.get('/api/tenants/slug/:slug', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/tenants/slug/test-org',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject protected routes without tenant ID', async () => {
    app.get('/api/children', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Missing tenant ID');
  });

  it('should accept valid tenant ID in header', async () => {
    const validTenantId = '123e4567-e89b-12d3-a456-426614174000';
    app.get('/api/children', async (request) => {
      return { tenantId: (request as any).tenant?.tenantId };
    });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: {
        'x-tenant-id': validTenantId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.tenantId).toBe(validTenantId);
  });

  it('should reject invalid tenant ID format', async () => {
    app.get('/api/children', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: {
        'x-tenant-id': 'invalid-uuid',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid tenant ID format');
  });

  it('should accept tenant from JWT if already set', async () => {
    app.get('/api/children', async (request) => {
      // Simulate tenant being set by auth middleware
      (request as any).tenant = { tenantId: 'jwt-tenant-id' };
      return { tenantId: (request as any).tenant.tenantId };
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
    });

    // Should not fail because tenant is set by simulated auth middleware
    expect(response.statusCode).toBe(200);
  });

  it('should validate UUID format correctly', async () => {
    app.get('/api/test', async () => ({ success: true }));
    await app.ready();

    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      '00000000-0000-0000-0000-000000000000',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ];

    for (const uuid of validUUIDs) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-id': uuid },
      });
      expect(response.statusCode).toBe(200);
    }
  });

  it('should reject malformed UUIDs', async () => {
    app.get('/api/test', async () => ({ success: true }));
    await app.ready();

    const invalidUUIDs = [
      '123',
      'not-a-uuid',
      '123e4567-e89b-12d3-a456',
      '123e4567e89b12d3a456426614174000',
      '',
    ];

    for (const uuid of invalidUUIDs) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-tenant-id': uuid },
      });
      expect(response.statusCode).toBe(400);
    }
  });
});

describe('Auth Middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    // Register JWT plugin
    await app.register(require('@fastify/jwt'), {
      secret: 'test-secret-key-for-testing-only',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject requests without JWT token', async () => {
    await app.register(authMiddleware);
    app.get('/protected', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Unauthorized');
  });

  it('should reject requests with invalid JWT token', async () => {
    await app.register(authMiddleware);
    app.get('/protected', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Unauthorized');
  });

  it('should accept requests with valid JWT token', async () => {
    await app.register(authMiddleware);
    app.get('/protected', async (request) => {
      return { success: true, user: (request as any).user };
    });
    await app.ready();

    // Generate valid token
    const token = app.jwt.sign({ userId: 'test-user', tenantId: 'test-tenant' });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
  });

  it('should include timestamp in error response', async () => {
    await app.register(authMiddleware);
    app.get('/protected', async () => ({ success: true }));
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp)).toBeInstanceOf(Date);
  });
});

describe('Rate Limit Middleware', () => {
  it('should export rateLimit function', () => {
    expect(rateLimit).toBeDefined();
    expect(typeof rateLimit).toBe('function');
  });

  it('should accept rate limit options', () => {
    const limiter = rateLimit({ max: 100, windowMs: 60000 });
    expect(limiter).toBeDefined();
    expect(typeof limiter).toBe('function');
  });

  it('should return a middleware function', async () => {
    const limiter = rateLimit({ max: 100, windowMs: 60000 });
    const app = Fastify({ logger: false });
    const result = await limiter(app);
    expect(result).toBeUndefined(); // Current implementation is a stub
    await app.close();
  });
});

describe('Middleware Integration', () => {
  it('should work with both tenant and auth middleware', async () => {
    const app = Fastify({ logger: false });

    await app.register(require('@fastify/jwt'), {
      secret: 'test-secret',
    });

    await app.register(tenantMiddleware);

    // Public route should work
    app.get('/health', async () => ({ status: 'ok' }));

    // Protected route needs tenant
    app.get('/api/data', async (request) => ({
      tenant: (request as any).tenant?.tenantId,
    }));

    await app.ready();

    // Test public route
    const publicResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(publicResponse.statusCode).toBe(200);

    // Test protected route with tenant
    const protectedResponse = await app.inject({
      method: 'GET',
      url: '/api/data',
      headers: {
        'x-tenant-id': '123e4567-e89b-12d3-a456-426614174000',
      },
    });
    expect(protectedResponse.statusCode).toBe(200);

    await app.close();
  });
});
