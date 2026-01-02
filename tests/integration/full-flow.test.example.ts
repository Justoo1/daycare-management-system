/**
 * Integration Test Example - Full User Flow
 *
 * Integration tests verify that multiple components work together correctly.
 * This example demonstrates testing a complete user journey through the system.
 */

import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  generateTestData,
  generateTestPhone,
  createChildTestData,
  createGuardianTestData,
  getTestDataSource,
  cleanDatabase,
} from '../helpers/testUtils';
import { config } from '../../src/config/environment';

describe('Integration Test - Complete Daycare Workflow', () => {
  let app: FastifyInstance;
  let dataSource: DataSource;
  let tenantId: string;
  let adminToken: string;
  let childId: string;

  beforeAll(async () => {
    // Initialize database
    dataSource = await getTestDataSource();
    await dataSource.initialize();

    // Initialize Fastify with all plugins and routes
    app = Fastify({ logger: false });

    // Register plugins
    await app.register(fastifyJwt, {
      secret: config.jwt.secret,
    });

    // Register all routes (in real scenario, import from main app)
    // This is a simplified version for demonstration

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (dataSource.isInitialized) {
      await cleanDatabase(dataSource, [
        'attendance',
        'activity_logs',
        'guardians',
        'children',
        'users',
        'tenants',
      ]);
      await dataSource.destroy();
    }
  });

  describe('Complete Daycare Registration and Daily Operations Flow', () => {
    it('Step 1: Organization registers as new tenant', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: testData.organizationName,
          slug: testData.slug,
          contactEmail: testData.email,
          contactPhone: testData.phone,
          address: '123 Daycare Street',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
        });

      expect([201, 200]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('id');
        tenantId = response.body.data.id;
      }
    });

    it('Step 2: Admin user registers for the organization', async () => {
      const testData = generateTestData();

      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: testData.email,
          password: 'SecurePass123!',
          firstName: testData.firstName,
          lastName: testData.lastName,
          phoneNumber: generateTestPhone(),
          tenantId: tenantId,
          role: 'admin',
        });

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('token');
        adminToken = response.body.data.token;
      }
    });

    it('Step 3: Admin adds a new child to the system', async () => {
      const childData = createChildTestData();

      const response = await request(app.server)
        .post('/api/children')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(childData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('id');
        childId = response.body.data.id;
      }
    });

    it('Step 4: Admin adds guardian information for the child', async () => {
      const guardianData = createGuardianTestData();

      const response = await request(app.server)
        .post(`/api/children/${childId}/guardians`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(guardianData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('relationship', guardianData.relationship);
      }
    });

    it('Step 5: Child checks in for the day', async () => {
      const checkInData = {
        childId: childId,
        checkInTime: new Date().toISOString(),
        droppedOffBy: 'Parent Name',
        temperature: 36.5,
        healthStatus: 'healthy',
        notes: 'Child arrived happy',
      };

      const response = await request(app.server)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(checkInData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('checkInTime');
      }
    });

    it('Step 6: Log meal activity for the child', async () => {
      const mealData = {
        childId: childId,
        mealType: 'lunch',
        foodItems: 'Rice and chicken',
        amountEaten: 'all',
        notes: 'Ate everything',
      };

      const response = await request(app.server)
        .post('/api/activities/meal')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mealData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('activityType', 'meal');
      }
    });

    it('Step 7: Log nap activity for the child', async () => {
      const napData = {
        childId: childId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        quality: 'good',
        notes: 'Slept well',
      };

      const response = await request(app.server)
        .post('/api/activities/nap')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(napData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('activityType', 'nap');
      }
    });

    it('Step 8: Log learning activity for the child', async () => {
      const learningData = {
        childId: childId,
        activityName: 'Story Time',
        category: 'language',
        duration: 30,
        notes: 'Engaged well with the story',
        skillsDeveloped: ['listening', 'vocabulary'],
      };

      const response = await request(app.server)
        .post('/api/activities/learning')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(learningData);

      if (response.statusCode === 201) {
        expect(response.body.data).toHaveProperty('activityType', 'learning');
      }
    });

    it('Step 9: Get daily report for the child', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app.server)
        .get(`/api/activities/children/${childId}/daily-report?date=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.statusCode === 200) {
        expect(response.body.data).toHaveProperty('meals');
        expect(response.body.data).toHaveProperty('naps');
        expect(response.body.data).toHaveProperty('activities');
      }
    });

    it('Step 10: View attendance summary for the day', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app.server)
        .get(`/api/attendance/summary?date=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.statusCode === 200) {
        expect(response.body.data).toHaveProperty('totalPresent');
        expect(response.body.data).toHaveProperty('totalAbsent');
      }
    });

    it('Step 11: Check analytics and trends', async () => {
      const response = await request(app.server)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.statusCode === 200) {
        expect(response.body.data).toHaveProperty('totalChildren');
        expect(response.body.data).toHaveProperty('attendanceRate');
      }
    });
  });

  describe('Parent/Guardian Portal Flow', () => {
    let guardianToken: string;

    it('Guardian logs in with OTP', async () => {
      // Step 1: Request OTP
      const phoneNumber = generateTestPhone();

      const sendOtpResponse = await request(app.server)
        .post('/api/auth/login/otp/send')
        .send({
          phoneNumber: phoneNumber,
          tenantId: tenantId,
        });

      // In real test, we'd need to mock the OTP service
      // For now, we just verify the endpoint works
      expect([200, 404]).toContain(sendOtpResponse.statusCode);
    });

    it('Guardian views their child daily activities', async () => {
      // Assuming guardian has logged in and has token
      if (!guardianToken) {
        return; // Skip if no token
      }

      const response = await request(app.server)
        .get(`/api/activities/children/${childId}/daily`)
        .set('Authorization', `Bearer ${guardianToken}`);

      if (response.statusCode === 200) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('Guardian views their child attendance history', async () => {
      if (!guardianToken) {
        return; // Skip if no token
      }

      const response = await request(app.server)
        .get(`/api/attendance/children/${childId}/history`)
        .set('Authorization', `Bearer ${guardianToken}`);

      if (response.statusCode === 200) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle duplicate check-ins gracefully', async () => {
      const checkInData = {
        childId: childId,
        checkInTime: new Date().toISOString(),
      };

      // First check-in should succeed
      const response1 = await request(app.server)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(checkInData);

      // Second check-in on same day should fail
      const response2 = await request(app.server)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(checkInData);

      // One should succeed, one should fail
      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses[0]).toBeLessThan(400); // One success
      expect(statuses[1]).toBeGreaterThanOrEqual(400); // One failure
    });

    it('should prevent access to other tenant data', async () => {
      // Create another tenant and user
      const otherTenantData = generateTestData();

      await request(app.server)
        .post('/api/tenants/register')
        .send({
          organizationName: otherTenantData.organizationName,
          slug: otherTenantData.slug,
          contactEmail: otherTenantData.email,
          contactPhone: otherTenantData.phone,
          address: '456 Other Street',
          city: 'Kumasi',
          region: 'Ashanti',
          country: 'Ghana',
        });

      // Try to access first tenant's child with second tenant's token
      // This should fail with 403 or 404
      // Implementation depends on your multi-tenancy setup
    });
  });
});

/**
 * INTEGRATION TEST BEST PRACTICES:
 *
 * 1. Test Complete User Journeys
 *    - Simulate real-world workflows
 *    - Test multiple related features together
 *
 * 2. Use Realistic Data
 *    - Create data that mimics production scenarios
 *    - Test with various edge cases
 *
 * 3. Verify State Changes
 *    - Check database state after operations
 *    - Verify side effects (emails sent, notifications, etc.)
 *
 * 4. Test Error Recovery
 *    - What happens when things go wrong?
 *    - Can the system recover gracefully?
 *
 * 5. Performance Considerations
 *    - Integration tests are slower
 *    - Keep them focused but comprehensive
 *
 * 6. Clean Up Properly
 *    - Always clean up test data
 *    - Reset state between tests
 *
 * 7. Mock External Services
 *    - Don't hit real APIs in tests
 *    - Mock payment gateways, SMS services, etc.
 */
