const express = require('express');
const path = require('path');
const db = require('./database');
const {
    initSession,
    trackPageView,
    trackInteraction,
    trackFormSubmission,
    trackPerformanceMetrics,
    logError,
    getSessionAnalytics,
    getAllSessions,
    getAllInteractions,
    getAllErrors
} = require('./tracking');
const session = require('express-session');
const PortManager = require('./utils/port-manager');
const abTestingManager = require('./utils/ab-testing');

const app = express();
let server = null;

// Initialize port manager
const portManager = new PortManager(process.env.PORT || 3001);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Session tracking middleware
app.use(async (req, res, next) => {
    try {
        if (!req.session.id) {
            const sessionId = await initSession(req);
            req.session.id = sessionId;
        }
        next();
    } catch (error) {
        console.error('Session tracking error:', error);
        next();
    }
});

// Page view tracking middleware
app.use(async (req, res, next) => {
    try {
        if (req.session.id) {
            await trackPageView(req.url, req.headers.referer);
        }
        next();
    } catch (error) {
        console.error('Page view tracking error:', error);
        next();
    }
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Analytics API Routes
app.get('/api/analytics/overview', async (req, res) => {
    try {
        const [activeUsers, totalSessions, errorCount] = await Promise.all([
            getActiveUsers(),
            getTotalSessions(),
            getErrorCount()
        ]);

        res.json({
            activeUsers,
            totalSessions,
            formSubmissions: 0,
            errorRate: Math.round((errorCount / totalSessions) * 100) || 0
        });
    } catch (error) {
        console.error('Failed to get analytics overview:', error);
        res.status(500).json({ error: 'Failed to get analytics overview' });
    }
});

app.get('/api/analytics/sessions', async (req, res) => {
    try {
        const sessions = await db.all(
            `SELECT 
                session_id,
                start_time,
                end_time,
                platform,
                browser,
                device_info
             FROM user_sessions 
             ORDER BY start_time DESC 
             LIMIT 100`
        );
        res.json(sessions);
    } catch (error) {
        console.error('Failed to get sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

app.get('/api/analytics/interactions', async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        let query = `SELECT * FROM user_interactions ORDER BY interaction_time DESC LIMIT 100`;
        let params = [];

        if (sessionId) {
            query = `SELECT * FROM user_interactions WHERE session_id = ? ORDER BY interaction_time DESC`;
            params = [sessionId];
        }

        const interactions = await db.all(query, params);
        res.json(interactions);
    } catch (error) {
        console.error('Failed to get interactions:', error);
        res.status(500).json({ error: 'Failed to get interactions' });
    }
});

app.get('/api/analytics/errors', async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        let query = `SELECT * FROM error_logs ORDER BY error_time DESC LIMIT 100`;
        let params = [];

        if (sessionId) {
            query = `SELECT * FROM error_logs WHERE session_id = ? ORDER BY error_time DESC`;
            params = [sessionId];
        }

        const errors = await db.all(query, params);
        res.json(errors);
    } catch (error) {
        console.error('Failed to get errors:', error);
        res.status(500).json({ error: 'Failed to get errors' });
    }
});

// Get specific session details
app.get('/api/analytics/sessions/:sessionId', async (req, res) => {
    try {
        const session = await db.get(
            `SELECT * FROM user_sessions WHERE session_id = ?`,
            [req.params.sessionId]
        );
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(session);
    } catch (error) {
        console.error('Failed to get session details:', error);
        res.status(500).json({ error: 'Failed to get session details' });
    }
});

// A/B Testing Routes

// Create a new A/B test
app.post('/api/ab-tests', async (req, res) => {
    try {
        const {
            testId,
            name,
            description,
            variants,
            weights,
            goals,
            startDate,
            endDate
        } = req.body;

        // Validate required fields
        if (!testId || !name || !variants || !goals) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Create test
        await abTestingManager.createTest(testId, {
            name,
            description,
            variants,
            weights,
            goals,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        res.json({ success: true, testId });
    } catch (error) {
        console.error('Failed to create A/B test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get test variant for a user
app.get('/api/ab-tests/:testId/variant', async (req, res) => {
    try {
        const { testId } = req.params;
        const userId = req.session.id; // Using session ID as user ID

        if (!userId) {
            return res.status(400).json({
                error: 'No active session'
            });
        }

        const variant = abTestingManager.assignUserToVariant(testId, userId);
        res.json({ variant });
    } catch (error) {
        console.error('Failed to get test variant:', error);
        res.status(500).json({ error: error.message });
    }
});

// Track test conversion
app.post('/api/ab-tests/:testId/conversion', async (req, res) => {
    try {
        const { testId } = req.params;
        const { goalId, metadata } = req.body;
        const userId = req.session.id;

        if (!userId || !goalId) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        await abTestingManager.trackConversion(testId, userId, goalId, metadata);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to track conversion:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get test results
app.get('/api/ab-tests/:testId/results', async (req, res) => {
    try {
        const { testId } = req.params;
        const results = await abTestingManager.getTestResults(testId);
        res.json(results);
    } catch (error) {
        console.error('Failed to get test results:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all active tests
app.get('/api/ab-tests', async (req, res) => {
    try {
        const tests = Array.from(abTestingManager.activeTests.entries()).map(([id, test]) => ({
            id,
            name: test.name,
            description: test.description,
            variants: test.variants,
            startDate: test.startDate,
            endDate: test.endDate,
            status: test.status || 'active'
        }));
        res.json(tests);
    } catch (error) {
        console.error('Failed to list A/B tests:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
async function getActiveUsers() {
    try {
        const result = await db.get(
            `SELECT COUNT(DISTINCT session_id) as count 
             FROM user_sessions 
             WHERE end_time IS NULL 
             AND start_time > datetime('now', '-1 hour')`
        );
        return result ? result.count : 0;
    } catch (error) {
        console.error('Error getting active users:', error);
        return 0;
    }
}

async function getTotalSessions() {
    try {
        const result = await db.get(
            `SELECT COUNT(*) as count 
             FROM user_sessions 
             WHERE start_time > datetime('now', '-24 hours')`
        );
        return result ? result.count : 0;
    } catch (error) {
        console.error('Error getting total sessions:', error);
        return 0;
    }
}

async function getErrorCount() {
    try {
        const result = await db.get(
            `SELECT COUNT(*) as count 
             FROM error_logs 
             WHERE error_time > datetime('now', '-24 hours')`
        );
        return result ? result.count : 0;
    } catch (error) {
        console.error('Error getting error count:', error);
        return 0;
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Log error using tracker if session exists
    if (req.session.id) {
        logError('server_error', err, {
            pageUrl: req.url,
            method: req.method,
            headers: req.headers
        }).catch(logErr => {
            console.error('Error logging to tracker:', logErr);
        });
    }

    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
    });
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Close HTTP server
    if (server) {
        console.log('Closing HTTP server...');
        await new Promise((resolve) => server.close(resolve));
    }
    
    // Close database connections
    console.log('Closing database connections...');
    await db.close();
    
    // Additional cleanup
    console.log('Cleanup complete. Exiting process.');
    process.exit(0);
}

// Register shutdown handlers
['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal));
});

// Start server function
async function startServer() {
    try {
        const port = await portManager.initialize();
        
        return new Promise((resolve, reject) => {
            server = app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
                console.log('Available routes:');
                console.log('- GET  /api/analytics/session/:sessionId');
                console.log('- POST /api/track/interaction');
                console.log('- POST /api/track/performance');
                console.log('- POST /api/submit-form');
                console.log('- GET  /api/analytics/overview');
                console.log('- GET  /api/analytics/sessions');
                console.log('- GET  /api/analytics/interactions');
                console.log('- GET  /api/analytics/errors');
                console.log('- POST /api/ab-tests');
                console.log('- GET  /api/ab-tests/:testId/variant');
                console.log('- POST /api/ab-tests/:testId/conversion');
                console.log('- GET  /api/ab-tests/:testId/results');
                console.log('- GET  /api/ab-tests');
                resolve(server);
            });

            server.on('error', async (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is in use, attempting to kill process...`);
                    try {
                        await portManager.killPort(port);
                        console.log('Process killed, retrying server start...');
                        setTimeout(() => startServer().then(resolve).catch(reject), 1000);
                    } catch (killError) {
                        console.error('Failed to kill process:', killError);
                        reject(killError);
                    }
                } else {
                    console.error('Server error:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}

// Start the server with retries
async function startServerWithRetries(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await startServer();
            return;
        } catch (error) {
            console.error(`Server start attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                console.error('Max retries reached, exiting...');
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Start the server
if (require.main === module) {
    startServerWithRetries().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = { app, startServer }; 