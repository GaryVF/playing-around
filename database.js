const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Database connection
const db = new sqlite3.Database(path.join(dataDir, 'user_interactions.db'));

// Initialize database schema
function initializeDatabase() {
    db.serialize(() => {
        // User Sessions table
        db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_agent TEXT,
            ip_address TEXT,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            device_info TEXT,
            platform TEXT,
            browser TEXT
        )`);

        // Page Views table
        db.run(`CREATE TABLE IF NOT EXISTS page_views (
            view_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            page_url TEXT,
            view_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            time_spent INTEGER,
            referrer TEXT,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
        )`);

        // User Interactions table
        db.run(`CREATE TABLE IF NOT EXISTS user_interactions (
            interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            interaction_type TEXT,
            element_id TEXT,
            element_class TEXT,
            element_text TEXT,
            page_url TEXT,
            interaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            additional_data TEXT,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
        )`);

        // Form Submissions table
        db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
            submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            form_id TEXT,
            submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            form_data TEXT,
            success BOOLEAN,
            error_message TEXT,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
        )`);

        // Error Logs table
        db.run(`CREATE TABLE IF NOT EXISTS error_logs (
            error_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            error_type TEXT,
            error_message TEXT,
            stack_trace TEXT,
            page_url TEXT,
            error_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            additional_data TEXT,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
        )`);

        // Performance Metrics table
        db.run(`CREATE TABLE IF NOT EXISTS performance_metrics (
            metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            page_url TEXT,
            load_time INTEGER,
            dom_interactive_time INTEGER,
            dom_complete_time INTEGER,
            first_paint_time INTEGER,
            first_contentful_paint_time INTEGER,
            metric_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
        )`);

        // New A/B Testing tables
        db.run(`CREATE TABLE IF NOT EXISTS ab_tests (
            test_id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            variants TEXT,
            weights TEXT,
            goals TEXT,
            start_date DATETIME,
            end_date DATETIME,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ab_test_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id TEXT,
            user_id TEXT,
            variant TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES ab_tests(test_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ab_test_conversions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id TEXT,
            user_id TEXT,
            variant TEXT,
            goal_id TEXT,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES ab_tests(test_id)
        )`);

        // Create indices for better query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_ab_assignments_test_user 
            ON ab_test_assignments(test_id, user_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ab_conversions_test 
            ON ab_test_conversions(test_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ab_conversions_variant 
            ON ab_test_conversions(variant)`);
    });
}

// Database operations
const dbOperations = {
    // Session Management
    createSession: (sessionData) => {
        return new Promise((resolve, reject) => {
            const { sessionId, userAgent, ipAddress, deviceInfo, platform, browser } = sessionData;
            db.run(
                `INSERT INTO user_sessions (session_id, user_agent, ip_address, device_info, platform, browser)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [sessionId, userAgent, ipAddress, deviceInfo, platform, browser],
                (err) => {
                    if (err) reject(err);
                    else resolve(sessionId);
                }
            );
        });
    },

    endSession: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE user_sessions SET end_time = CURRENT_TIMESTAMP WHERE session_id = ?`,
                [sessionId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Page View Tracking
    recordPageView: (pageData) => {
        return new Promise((resolve, reject) => {
            const { sessionId, pageUrl, timeSpent, referrer } = pageData;
            db.run(
                `INSERT INTO page_views (session_id, page_url, time_spent, referrer)
                 VALUES (?, ?, ?, ?)`,
                [sessionId, pageUrl, timeSpent, referrer],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // User Interaction Tracking
    recordInteraction: (interactionData) => {
        return new Promise((resolve, reject) => {
            const {
                sessionId,
                interactionType,
                elementId,
                elementClass,
                elementText,
                pageUrl,
                additionalData
            } = interactionData;
            
            db.run(
                `INSERT INTO user_interactions 
                 (session_id, interaction_type, element_id, element_class, element_text, page_url, additional_data)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, interactionType, elementId, elementClass, elementText, pageUrl, 
                 additionalData ? JSON.stringify(additionalData) : null],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Form Submission Tracking
    recordFormSubmission: (formData) => {
        return new Promise((resolve, reject) => {
            const { sessionId, formId, formData: data, success, errorMessage } = formData;
            db.run(
                `INSERT INTO form_submissions 
                 (session_id, form_id, form_data, success, error_message)
                 VALUES (?, ?, ?, ?, ?)`,
                [sessionId, formId, JSON.stringify(data), success, errorMessage],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Error Logging
    logError: (errorData) => {
        return new Promise((resolve, reject) => {
            const {
                sessionId,
                errorType,
                errorMessage,
                stackTrace,
                pageUrl,
                additionalData
            } = errorData;
            
            db.run(
                `INSERT INTO error_logs 
                 (session_id, error_type, error_message, stack_trace, page_url, additional_data)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [sessionId, errorType, errorMessage, stackTrace, pageUrl, 
                 additionalData ? JSON.stringify(additionalData) : null],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Performance Metrics Recording
    recordPerformanceMetrics: (metricsData) => {
        return new Promise((resolve, reject) => {
            const {
                sessionId,
                pageUrl,
                loadTime,
                domInteractiveTime,
                domCompleteTime,
                firstPaintTime,
                firstContentfulPaintTime
            } = metricsData;
            
            db.run(
                `INSERT INTO performance_metrics 
                 (session_id, page_url, load_time, dom_interactive_time, dom_complete_time, 
                  first_paint_time, first_contentful_paint_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, pageUrl, loadTime, domInteractiveTime, domCompleteTime, 
                 firstPaintTime, firstContentfulPaintTime],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Query Operations
    getSessionData: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM user_sessions WHERE session_id = ?`,
                [sessionId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    getSessionInteractions: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM user_interactions WHERE session_id = ? ORDER BY interaction_time DESC`,
                [sessionId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    getSessionFormSubmissions: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM form_submissions WHERE session_id = ? ORDER BY submission_time DESC`,
                [sessionId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    getSessionErrors: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM error_logs WHERE session_id = ? ORDER BY error_time DESC`,
                [sessionId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    getSessionPerformanceMetrics: (sessionId) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM performance_metrics WHERE session_id = ? ORDER BY metric_time DESC`,
                [sessionId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    // Direct database access methods
    all: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    get: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
};

// Initialize database on module load
initializeDatabase();

// Export database operations and connection
module.exports = {
    ...dbOperations,
    db,
    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}; 