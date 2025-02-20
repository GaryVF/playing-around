const DatabaseOperations = require('../../utils/db-operations');
const path = require('path');

describe('DatabaseOperations', () => {
  let dbOps;

  beforeAll(async () => {
    dbOps = new DatabaseOperations();
    await dbOps.initialize();
  });

  afterAll(async () => {
    await dbOps.close();
  });

  describe('Session Management', () => {
    let testSessionId;

    test('should create a new session', async () => {
      const sessionData = {
        userId: 'test-user-1',
        userAgent: 'Jest Test Runner',
        ipAddress: '127.0.0.1',
        startTime: new Date().toISOString()
      };

      const result = await dbOps.createSession(sessionData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      testSessionId = result.id;
    });

    test('should end a session', async () => {
      const endTime = new Date().toISOString();
      const result = await dbOps.endSession(testSessionId, endTime);
      expect(result).toBeDefined();
      expect(result.endTime).toBe(endTime);
    });

    test('should get active users count', async () => {
      const count = await dbOps.getActiveUsers();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Page View Tracking', () => {
    test('should record a page view', async () => {
      const pageData = {
        sessionId: 'test-session-1',
        url: '/test-page',
        title: 'Test Page',
        timestamp: new Date().toISOString()
      };

      const result = await dbOps.recordPageView(pageData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should get page view statistics', async () => {
      const stats = await dbOps.getPageViewStats();
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('Error Logging', () => {
    test('should log an error', async () => {
      const errorData = {
        sessionId: 'test-session-1',
        error: 'Test error message',
        stackTrace: 'Test stack trace',
        timestamp: new Date().toISOString()
      };

      const result = await dbOps.logError(errorData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should get error statistics', async () => {
      const stats = await dbOps.getErrorStats();
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(Array.isArray(stats.recent)).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    test('should record performance metrics', async () => {
      const metricsData = {
        sessionId: 'test-session-1',
        pageLoadTime: 1200,
        resourceLoadTime: 800,
        timestamp: new Date().toISOString()
      };

      const result = await dbOps.recordPerformanceMetrics(metricsData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should get performance statistics', async () => {
      const stats = await dbOps.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.averagePageLoadTime).toBeDefined();
      expect(stats.averageResourceLoadTime).toBeDefined();
    });
  });

  describe('Health Check', () => {
    test('should perform health check', async () => {
      const health = await dbOps.healthCheck();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.lastError).toBeDefined();
      expect(health.connectionPool).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid session ID gracefully', async () => {
      await expect(dbOps.endSession('invalid-id'))
        .rejects
        .toThrow();
    });

    test('should handle invalid data gracefully', async () => {
      await expect(dbOps.createSession({}))
        .rejects
        .toThrow();
    });

    test('should handle database connection errors', async () => {
      // Simulate a connection error by closing the pool
      await dbOps.close();
      await expect(dbOps.getActiveUsers())
        .rejects
        .toThrow();
      // Reinitialize for other tests
      await dbOps.initialize();
    });
  });
}); 