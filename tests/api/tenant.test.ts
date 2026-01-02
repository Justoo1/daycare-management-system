import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TenantController } from '../../src/controllers/TenantController';
import * as tenantSchemas from '../../src/schemas/tenant.schema';
import {
  generateTestData,
  getTestDataSource,
  cleanDatabase,
  assertSuccess,
  assertError,
} from '../helpers/testUtils';

describe('Tenant API Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let createdTenantId: string;
  let createdTenantSlug: string;

  beforeAll(async () => {
    // Initialize database connection
    dataSource = await getTestDataSource();
    await dataSource.initialize();

    // Create test Fastify instance
    app = Fastify({ logger: false });

    // Register tenant routes
    app.post('/api/tenants/register', { schema: tenantSchemas.registerTenantSchema }, TenantController.register);
    app.get('/api/tenants/slug/:slug', { schema: tenantSchemas.getTenantBySlugSchema }, TenantController.getTenantBySlug);
    app.get('/api/tenants/:id', { schema: tenantSchemas.getTenantByIdSchema }, TenantController.getTenantById);

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (dataSource.isInitialized) {
      await cleanDatabase(dataSource, ['tenants']);
      await dataSource.destroy();
    }
  });

  describe('POST /api/tenants/register', () => {
    it('should register a new tenant successfully', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('organizationName', testData.organizationName);
      expect(response.body.data).toHaveProperty('slug', testData.slug);
      expect(response.body.data).toHaveProperty('contactEmail', testData.email);
      expect(response.body.data).toHaveProperty('isActive', true);

      // Save for later tests
      createdTenantId = response.body.data.id;
      createdTenantSlug = response.body.data.slug;
    });

    it('should fail to register with duplicate slug', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: 'Another Organization',
          slug: createdTenantSlug, // Use existing slug
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '456 Test Avenue',
          city: 'Kumasi',
          region: 'Ashanti',
          country: 'Ghana',
        });

      assertError(response, 400);
      expect(response.body.error).toContain('slug');
    });

    it('should fail to register without required fields', async () => {
      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: 'Test Org',
        });

      assertError(response, 400);
    });

    it('should fail to register with invalid email', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: 'invalid-email',
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      assertError(response, 400);
    });

    it('should fail to register with invalid slug format', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: 'Invalid Slug With Spaces!',
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      assertError(response, 400);
    });

    it('should register tenant with optional fields', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
          website: 'https://example.com',
          description: 'A test daycare organization',
        });

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('website', 'https://example.com');
      expect(response.body.data).toHaveProperty('description');
    });
  });

  describe('GET /api/tenants/slug/:slug', () => {
    it('should retrieve tenant by slug successfully', async () => {
      const response = await request(app.server).get(`/api/tenants/slug/${createdTenantSlug}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id', createdTenantId);
      expect(response.body.data).toHaveProperty('slug', createdTenantSlug);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app.server).get('/api/tenants/slug/non-existent-slug-12345');

      assertError(response, 404);
    });

    it('should fail with invalid slug format', async () => {
      const response = await request(app.server).get('/api/tenants/slug/Invalid Slug!');

      assertError(response);
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('should retrieve tenant by ID successfully', async () => {
      const response = await request(app.server).get(`/api/tenants/${createdTenantId}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id', createdTenantId);
      expect(response.body.data).toHaveProperty('slug', createdTenantSlug);
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.server).get(`/api/tenants/${fakeId}`);

      assertError(response, 404);
    });

    it('should fail with invalid UUID format', async () => {
      const response = await request(app.server).get('/api/tenants/invalid-uuid');

      assertError(response, 400);
    });
  });

  describe('Tenant Data Validation', () => {
    it('should validate Ghana-specific regions', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data.region).toBe('Greater Accra');
    });

    it('should handle long organization names', async () => {
      const testData = generateTestData();
      const longName = 'A'.repeat(200);

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: longName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
    });

    it('should validate website URL format', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Test Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
          website: 'not-a-valid-url',
        });

      assertError(response, 400);
    });
  });
});
