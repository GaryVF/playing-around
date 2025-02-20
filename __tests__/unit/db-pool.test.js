const DatabasePool = require('../../utils/db-pool');
const path = require('path');

describe('DatabasePool', () => {
  let pool;
  const testDbPath = path.join(__dirname, '..', '..', 'data', 'test.db');

  beforeAll(async () => {
    pool = new DatabasePool(testDbPath, {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 5000,
      createTimeoutMillis: 5000,
      idleTimeoutMillis: 5000
    });
    await pool.initialize();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Connection Management', () => {
    test('should create a pool with specified options', () => {
      expect(pool).toBeDefined();
      expect(pool.pool).toBeDefined();
    });

    test('should acquire a connection successfully', async () => {
      const connection = await pool.acquire();
      expect(connection).toBeDefined();
      expect(typeof connection.prepare).toBe('function');
      await pool.release(connection);
    });

    test('should release a connection back to the pool', async () => {
      const connection = await pool.acquire();
      await pool.release(connection);
      // Verify we can acquire the same connection again
      const connection2 = await pool.acquire();
      expect(connection2).toBeDefined();
      await pool.release(connection2);
    });
  });

  describe('Query Execution', () => {
    test('should execute a simple query successfully', async () => {
      const result = await pool.execute('SELECT 1 + 1 as sum');
      expect(result).toBeDefined();
      expect(result[0].sum).toBe(2);
    });

    test('should handle query errors gracefully', async () => {
      await expect(pool.execute('INVALID SQL'))
        .rejects
        .toThrow();
    });
  });

  describe('Transaction Management', () => {
    test('should execute transaction successfully', async () => {
      const result = await pool.transaction(async (tx) => {
        await tx.execute('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, value TEXT)');
        await tx.execute('INSERT INTO test_table (value) VALUES (?)', ['test']);
        const rows = await tx.execute('SELECT * FROM test_table');
        return rows;
      });
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].value).toBe('test');
    });

    test('should rollback transaction on error', async () => {
      await expect(pool.transaction(async (tx) => {
        await tx.execute('INSERT INTO test_table (value) VALUES (?)', ['test2']);
        throw new Error('Test error');
      })).rejects.toThrow('Test error');

      // Verify the insert was rolled back
      const result = await pool.execute('SELECT * FROM test_table WHERE value = ?', ['test2']);
      expect(result.length).toBe(0);
    });
  });

  describe('Health Check', () => {
    test('should return pool health status', async () => {
      const health = await pool.healthCheck();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.poolSize).toBeDefined();
      expect(health.available).toBeDefined();
      expect(health.pending).toBeDefined();
    });
  });
}); 