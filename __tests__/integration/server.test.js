const request = require('supertest');
const path = require('path');
const app = require('../../server');

describe('Server Integration Tests', () => {
  let server;
  let agent;

  beforeAll(async () => {
    server = await app.startServer();
    agent = request.agent(server);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Analytics Endpoints', () => {
    describe('GET /api/analytics/overview', () => {
      test('should return analytics overview', async () => {
        const response = await agent
          .get('/api/analytics/overview')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.activeUsers).toBeDefined();
        expect(response.body.totalSessions).toBeDefined();
        expect(response.body.errorCount).toBeDefined();
      });
    });

    describe('GET /api/analytics/sessions', () => {
      test('should return session data', async () => {
        const response = await agent
          .get('/api/analytics/sessions')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBe(true);
      });

      test('should handle pagination', async () => {
        const response = await agent
          .get('/api/analytics/sessions?page=1&limit=10')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(10);
      });
    });

    describe('GET /api/analytics/errors', () => {
      test('should return error logs', async () => {
        const response = await agent
          .get('/api/analytics/errors')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBe(true);
      });

      test('should filter errors by severity', async () => {
        const response = await agent
          .get('/api/analytics/errors?severity=error')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Tracking Endpoints', () => {
    describe('POST /api/track/pageview', () => {
      test('should record page view', async () => {
        const pageData = {
          url: '/test-page',
          title: 'Test Page',
          referrer: 'http://example.com'
        };

        const response = await agent
          .post('/api/track/pageview')
          .send(pageData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
      });

      test('should handle invalid page data', async () => {
        const response = await agent
          .post('/api/track/pageview')
          .send({})
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/track/error', () => {
      test('should log client error', async () => {
        const errorData = {
          message: 'Test error',
          stack: 'Test stack trace',
          severity: 'error'
        };

        const response = await agent
          .post('/api/track/error')
          .send(errorData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
      });

      test('should handle invalid error data', async () => {
        const response = await agent
          .post('/api/track/error')
          .send({})
          .expect(400);

        expect(response.body).toBeDefined();
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Health Check', () => {
    test('should return server health status', async () => {
      const response = await agent
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors', async () => {
      const response = await agent
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
    });

    test('should handle server errors', async () => {
      // Simulate a server error by passing invalid parameters
      const response = await agent
        .get('/api/analytics/sessions?page=invalid')
        .expect(500);

      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
    });
  });
}); 