const Database = require('better-sqlite3');
const genericPool = require('generic-pool');
const path = require('path');

class DatabasePool {
    constructor(dbPath, options = {}) {
        this.dbPath = dbPath;
        this.options = {
            min: options.min || 2,
            max: options.max || 10,
            acquireTimeoutMillis: options.acquireTimeoutMillis || 30000,
            createTimeoutMillis: options.createTimeoutMillis || 30000,
            idleTimeoutMillis: options.idleTimeoutMillis || 30000,
            ...options
        };

        this.pool = this.createPool();
    }

    createPool() {
        const factory = {
            create: async () => {
                const db = new Database(this.dbPath, {
                    verbose: console.log,
                    fileMustExist: false
                });
                
                // Enable WAL mode for better concurrency
                db.pragma('journal_mode = WAL');
                db.pragma('synchronous = NORMAL');
                
                return db;
            },
            destroy: async (db) => {
                db.close();
            },
            validate: (db) => {
                try {
                    // Test the connection with a simple query
                    db.prepare('SELECT 1').get();
                    return true;
                } catch (error) {
                    return false;
                }
            }
        };

        return genericPool.createPool(factory, this.options);
    }

    async withConnection(operation) {
        let conn = null;
        try {
            conn = await this.pool.acquire();
            return await operation(conn);
        } finally {
            if (conn) {
                await this.pool.release(conn);
            }
        }
    }

    async query(sql, params = []) {
        return this.withConnection(db => {
            const stmt = db.prepare(sql);
            return stmt.all(params);
        });
    }

    async get(sql, params = []) {
        return this.withConnection(db => {
            const stmt = db.prepare(sql);
            return stmt.get(params);
        });
    }

    async run(sql, params = []) {
        return this.withConnection(db => {
            const stmt = db.prepare(sql);
            return stmt.run(params);
        });
    }

    async transaction(operations) {
        return this.withConnection(db => {
            return db.transaction(() => {
                return operations(db);
            })();
        });
    }

    async close() {
        await this.pool.drain();
        await this.pool.clear();
    }

    // Health check method
    async healthCheck() {
        try {
            await this.query('SELECT 1');
            return {
                status: 'healthy',
                pool: {
                    size: this.pool.size,
                    available: this.pool.available,
                    pending: this.pool.pending,
                    max: this.pool.max,
                    min: this.pool.min
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                pool: {
                    size: this.pool.size,
                    available: this.pool.available,
                    pending: this.pool.pending,
                    max: this.pool.max,
                    min: this.pool.min
                }
            };
        }
    }
}

// Create and export singleton instance
const dbPath = path.join(__dirname, '..', 'data', 'user_interactions.db');
const pool = new DatabasePool(dbPath);

module.exports = pool; 