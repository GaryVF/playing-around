const db = require('./database');
const { v4: uuidv4 } = require('uuid');

class UserTracker {
    constructor() {
        this.currentSession = null;
        this.pageLoadTime = null;
        this.performanceMetrics = {};
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    async retry(operation, retries = this.maxRetries) {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying operation, ${retries} attempts remaining...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retry(operation, retries - 1);
            }
            throw error;
        }
    }

    // Initialize a new session with retry
    async initSession(req) {
        return this.retry(async () => {
            const sessionId = uuidv4();
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.ip;
            
            // Parse user agent for device info
            const deviceInfo = this.parseUserAgent(userAgent);

            try {
                await db.createSession({
                    sessionId,
                    userAgent,
                    ipAddress,
                    deviceInfo: JSON.stringify(deviceInfo),
                    platform: deviceInfo.platform,
                    browser: deviceInfo.browser
                });

                this.currentSession = sessionId;
                return sessionId;
            } catch (error) {
                console.error('Failed to initialize session:', error);
                throw error;
            }
        });
    }

    // End current session with retry
    async endSession() {
        if (!this.currentSession) return;

        return this.retry(async () => {
            try {
                await db.endSession(this.currentSession);
                this.currentSession = null;
            } catch (error) {
                console.error('Failed to end session:', error);
                throw error;
            }
        });
    }

    // Track page view with retry
    async trackPageView(pageUrl, referrer) {
        if (!this.currentSession) {
            console.warn('No active session for page view tracking');
            return;
        }

        return this.retry(async () => {
            const timeSpent = this.pageLoadTime ? Date.now() - this.pageLoadTime : 0;
            await db.recordPageView({
                sessionId: this.currentSession,
                pageUrl,
                timeSpent,
                referrer
            });
            this.pageLoadTime = Date.now();
        });
    }

    // Track user interaction with retry
    async trackInteraction(interactionData) {
        if (!this.currentSession) {
            console.warn('No active session for interaction tracking');
            return;
        }

        return this.retry(async () => {
            await db.recordInteraction({
                sessionId: this.currentSession,
                ...interactionData,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Track form submission with retry
    async trackFormSubmission(formData) {
        if (!this.currentSession) {
            console.warn('No active session for form submission tracking');
            return;
        }

        return this.retry(async () => {
            await db.recordFormSubmission({
                sessionId: this.currentSession,
                ...formData,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Track performance metrics with retry
    async trackPerformanceMetrics(metrics) {
        if (!this.currentSession) {
            console.warn('No active session for performance tracking');
            return;
        }

        return this.retry(async () => {
            await db.recordPerformanceMetrics({
                sessionId: this.currentSession,
                ...metrics,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Log errors with retry
    async logError(errorType, error, additionalData = {}) {
        if (!this.currentSession) {
            console.warn('No active session for error logging');
            return;
        }

        return this.retry(async () => {
            await db.logError({
                sessionId: this.currentSession,
                errorType,
                errorMessage: error.message,
                stackTrace: error.stack,
                pageUrl: additionalData.pageUrl || '',
                additionalData: JSON.stringify(additionalData),
                timestamp: new Date().toISOString()
            });
        });
    }

    // Helper method to parse user agent
    parseUserAgent(userAgent) {
        // This is a simple implementation. Consider using a proper user-agent parsing library
        const deviceInfo = {
            platform: 'unknown',
            browser: 'unknown',
            device: 'unknown'
        };

        // Platform detection
        if (userAgent.includes('Windows')) deviceInfo.platform = 'Windows';
        else if (userAgent.includes('Mac')) deviceInfo.platform = 'MacOS';
        else if (userAgent.includes('Linux')) deviceInfo.platform = 'Linux';
        else if (userAgent.includes('Android')) deviceInfo.platform = 'Android';
        else if (userAgent.includes('iOS')) deviceInfo.platform = 'iOS';

        // Browser detection
        if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
        else if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
        else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
        else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
        else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) deviceInfo.browser = 'Internet Explorer';

        // Device type detection
        if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
        else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
        else deviceInfo.device = 'Desktop';

        return deviceInfo;
    }

    // Get session analytics
    async getSessionAnalytics(sessionId = this.currentSession) {
        if (!sessionId) return null;

        try {
            const [
                sessionData,
                interactions,
                formSubmissions,
                errors,
                performanceMetrics
            ] = await Promise.all([
                db.getSessionData(sessionId),
                db.getSessionInteractions(sessionId),
                db.getSessionFormSubmissions(sessionId),
                db.getSessionErrors(sessionId),
                db.getSessionPerformanceMetrics(sessionId)
            ]);

            return {
                session: sessionData,
                interactions,
                formSubmissions,
                errors,
                performanceMetrics
            };
        } catch (error) {
            console.error('Failed to get session analytics:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const tracker = new UserTracker();

// Admin data retrieval methods
async function getAllSessions() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM user_sessions ORDER BY start_time DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getAllInteractions() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT ui.*, us.user_agent, us.ip_address 
             FROM user_interactions ui 
             JOIN user_sessions us ON ui.session_id = us.session_id 
             ORDER BY interaction_time DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getAllFormSubmissions() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT fs.*, us.user_agent, us.ip_address 
             FROM form_submissions fs 
             JOIN user_sessions us ON fs.session_id = us.session_id 
             ORDER BY submission_time DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getAllErrors() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT el.*, us.user_agent, us.ip_address 
             FROM error_logs el 
             JOIN user_sessions us ON el.session_id = us.session_id 
             ORDER BY error_time DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getAllPerformanceMetrics() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT pm.*, us.user_agent, us.ip_address 
             FROM performance_metrics pm 
             JOIN user_sessions us ON pm.session_id = us.session_id 
             ORDER BY load_time DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Export the tracker instance and admin methods
module.exports = {
    tracker,
    initSession: tracker.initSession.bind(tracker),
    endSession: tracker.endSession.bind(tracker),
    trackPageView: tracker.trackPageView.bind(tracker),
    trackInteraction: tracker.trackInteraction.bind(tracker),
    trackFormSubmission: tracker.trackFormSubmission.bind(tracker),
    trackPerformanceMetrics: tracker.trackPerformanceMetrics.bind(tracker),
    logError: tracker.logError.bind(tracker),
    getSessionAnalytics: tracker.getSessionAnalytics.bind(tracker),
    getAllSessions,
    getAllInteractions,
    getAllFormSubmissions,
    getAllErrors,
    getAllPerformanceMetrics
}; 