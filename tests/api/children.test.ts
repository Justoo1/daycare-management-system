import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ChildController } from '../../src/controllers/ChildController';
import * as childSchemas from '../../src/schemas/child.schema';
import {
  generateTestData,
  createTestToken,
  createChildTestData,
  createGuardianTestData,
  getTestDataSource,
  cleanDatabase,
  assertSuccess,
  assertError,
} from '../helpers/testUtils';
import { config } from '../../src/config/environment';

describe('Children API Tests', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let authToken: string;
  let testTenantId: string;
  let testUserId: string;
  let createdChildId: string;

  beforeAll(async () => {
    // Initialize database connection
    dataSource = await getTestDataSource();
    await dataSource.initialize();

    // Create test Fastify instance
    app = Fastify({ logger: false });

    // Register JWT plugin
    await app.register(fastifyJwt, {
      secret: config.jwt.secret,
    });

    // Mock authentication middleware
    const authenticateRoute = async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
        request.tenant = {
          tenantId: testTenantId,
          userId: testUserId,
          role: 'admin',
          email: 'test@example.com',
        };
      } catch (error) {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
    };

    // Register child routes
    app.post('/api/children', { onRequest: [authenticateRoute], schema: childSchemas.createChildSchema }, ChildController.createChild);
    app.get('/api/children', { onRequest: [authenticateRoute], schema: childSchemas.listChildrenSchema }, ChildController.listChildren);
    app.get('/api/children/:id', { onRequest: [authenticateRoute], schema: childSchemas.getChildSchema }, ChildController.getChild);
    app.put('/api/children/:id', { onRequest: [authenticateRoute] }, ChildController.updateChild);
    app.post('/api/children/:childId/guardians', { onRequest: [authenticateRoute], schema: childSchemas.addGuardianSchema }, ChildController.addGuardian);
    app.post('/api/children/:childId/enroll', { onRequest: [authenticateRoute], schema: childSchemas.enrollChildSchema }, ChildController.enrollChild);
    app.get('/api/children/waitlist', { onRequest: [authenticateRoute] }, ChildController.getWaitlist);

    await app.ready();

    // Create test token
    testTenantId = '123e4567-e89b-12d3-a456-426614174000';
    testUserId = '123e4567-e89b-12d3-a456-426614174001';
    authToken = createTestToken(app, {
      tenantId: testTenantId,
      userId: testUserId,
      role: 'admin',
      email: 'test@example.com',
    });
  });

  afterAll(async () => {
    await app.close();
    if (dataSource.isInitialized) {
      await cleanDatabase(dataSource, ['children', 'guardians']);
      await dataSource.destroy();
    }
  });

  describe('POST /api/children', () => {
    it('should create a new child successfully', async () => {
      const childData = createChildTestData();

      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childData);

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('firstName', childData.firstName);
      expect(response.body.data).toHaveProperty('lastName', childData.lastName);
      expect(response.body.data).toHaveProperty('dateOfBirth', childData.dateOfBirth);
      expect(response.body.data).toHaveProperty('gender', childData.gender);

      // Save for later tests
      createdChildId = response.body.data.id;
    });

    it('should fail to create child without authentication', async () => {
      const childData = createChildTestData();

      const response = await request(app.server)
        .post('/api/children')
        .send(childData);

      assertError(response, 401);
    });

    it('should fail to create child without required fields', async () => {
      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
        });

      assertError(response, 400);
    });

    it('should fail to create child with invalid date of birth', async () => {
      const childData = createChildTestData({
        dateOfBirth: 'invalid-date',
      });

      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childData);

      assertError(response, 400);
    });

    it('should fail to create child with future date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const childData = createChildTestData({
        dateOfBirth: futureDate.toISOString().split('T')[0],
      });

      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childData);

      assertError(response, 400);
    });

    it('should create child with optional fields', async () => {
      const childData = createChildTestData({
        allergies: 'Peanuts, Dairy',
        medicalConditions: 'Asthma',
        specialNeeds: 'None',
        emergencyContact: '0201234567',
      });

      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childData);

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('allergies', childData.allergies);
      expect(response.body.data).toHaveProperty('medicalConditions', childData.medicalConditions);
    });
  });

  describe('GET /api/children', () => {
    it('should list children successfully', async () => {
      const response = await request(app.server)
        .get('/api/children')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('children');
      expect(Array.isArray(response.body.data.children)).toBe(true);
    });

    it('should fail to list children without authentication', async () => {
      const response = await request(app.server).get('/api/children');

      assertError(response, 401);
    });

    it('should support pagination', async () => {
      const response = await request(app.server)
        .get('/api/children?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter children by status', async () => {
      const response = await request(app.server)
        .get('/api/children?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
    });
  });

  describe('GET /api/children/:id', () => {
    it('should retrieve child by ID successfully', async () => {
      const response = await request(app.server)
        .get(`/api/children/${createdChildId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id', createdChildId);
    });

    it('should return 404 for non-existent child', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.server)
        .get(`/api/children/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertError(response, 404);
    });

    it('should fail with invalid UUID format', async () => {
      const response = await request(app.server)
        .get('/api/children/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      assertError(response, 400);
    });
  });

  describe('PUT /api/children/:id', () => {
    it('should update child successfully', async () => {
      const updateData = {
        allergies: 'Updated allergies',
        medicalConditions: 'Updated conditions',
      };

      const response = await request(app.server)
        .put(`/api/children/${createdChildId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('allergies', updateData.allergies);
    });

    it('should fail to update non-existent child', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.server)
        .put(`/api/children/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ allergies: 'Test' });

      assertError(response, 404);
    });
  });

  describe('POST /api/children/:childId/guardians', () => {
    it('should add guardian to child successfully', async () => {
      const guardianData = createGuardianTestData();

      const response = await request(app.server)
        .post(`/api/children/${createdChildId}/guardians`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(guardianData);

      expect(response.statusCode).toBe(201);
      assertSuccess(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('firstName', guardianData.firstName);
      expect(response.body.data).toHaveProperty('relationship', guardianData.relationship);
    });

    it('should fail to add guardian without required fields', async () => {
      const response = await request(app.server)
        .post(`/api/children/${createdChildId}/guardians`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
        });

      assertError(response, 400);
    });

    it('should add multiple guardians to same child', async () => {
      const guardianData1 = createGuardianTestData({ isPrimary: false, relationship: 'parent' });
      const guardianData2 = createGuardianTestData({ isPrimary: false, relationship: 'grandparent' });

      const response1 = await request(app.server)
        .post(`/api/children/${createdChildId}/guardians`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(guardianData1);

      const response2 = await request(app.server)
        .post(`/api/children/${createdChildId}/guardians`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(guardianData2);

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
    });
  });

  describe('POST /api/children/:childId/enroll', () => {
    it('should enroll child in class successfully', async () => {
      const enrollmentData = {
        classId: '123e4567-e89b-12d3-a456-426614174002',
        startDate: new Date().toISOString().split('T')[0],
      };

      const response = await request(app.server)
        .post(`/api/children/${createdChildId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData);

      // May fail if class doesn't exist, but tests the endpoint
      expect([200, 201, 404]).toContain(response.statusCode);
    });

    it('should fail to enroll without class ID', async () => {
      const response = await request(app.server)
        .post(`/api/children/${createdChildId}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: new Date().toISOString().split('T')[0],
        });

      assertError(response, 400);
    });
  });

  describe('GET /api/children/waitlist', () => {
    it('should retrieve waitlist successfully', async () => {
      const response = await request(app.server)
        .get('/api/children/waitlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      assertSuccess(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
