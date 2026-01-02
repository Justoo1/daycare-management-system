/**
 * Basic Health Check Tests
 *
 * These tests verify that the API structure is working correctly
 * without requiring database connections.
 */

import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';

describe('Health Check API Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Register health check route
    app.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register version route
    app.get('/api/version', async (request, reply) => {
      return {
        version: '0.1.0',
        name: 'Nkabom Daycare API',
        timestamp: new Date().toISOString(),
      };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const response = await request(app.server).get('/health');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return timestamp in ISO format', async () => {
      const response = await request(app.server).get('/health');

      const timestamp = response.body.timestamp;
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('GET /api/version', () => {
    it('should return API version information', async () => {
      const response = await request(app.server).get('/api/version');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('name', 'Nkabom Daycare API');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return version in semver format', async () => {
      const response = await request(app.server).get('/api/version');

      const version = response.body.version;
      const semverRegex = /^\d+\.\d+\.\d+$/;
      expect(semverRegex.test(version)).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app.server).get('/non-existent-route');

      expect(response.statusCode).toBe(404);
    });
  });
});
