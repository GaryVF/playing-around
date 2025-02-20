const pool = require('./db-pool');

class DatabaseOperations {
    // Session Management
    async createSession(sessionData) {
        const { sessionId, userAgent, ipAddress, deviceInfo, platform, browser } = sessionData;
        return pool.run(
            `INSERT INTO user_sessions (session_id, user_agent, ip_address, device_info, platform, browser)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, userAgent, ipAddress, deviceInfo, platform, browser]
        );
    }

    async endSession(sessionId) {
        return pool.run(
            `UPDATE user_sessions SET end_time = CURRENT_TIMESTAMP WHERE session_id = ?`,
            [sessionId]
        );
    }

    async deleteSession(sessionId) {
        return pool.run(
            `DELETE FROM user_sessions WHERE session_id = ?`,
            [sessionId]
        );
    }

    // Page View Tracking
    async recordPageView(pageData) {
        const { sessionId, pageUrl, timeSpent, referrer } = pageData;
        return pool.run(
            `INSERT INTO page_views (session_id, page_url, time_spent, referrer)
             VALUES (?, ?, ?, ?)`,
            [sessionId, pageUrl, timeSpent, referrer]
        );
    }

    // User Interaction Tracking
    async recordInteraction(interactionData) {
        const {
            sessionId,
            interactionType,
            elementId,
            elementClass,
            elementText,
            pageUrl,
            additionalData,
            timestamp
        } = interactionData;
        
        return pool.run(
            `INSERT INTO user_interactions 
             (session_id, interaction_type, element_id, element_class, element_text, page_url, additional_data, interaction_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sessionId,
                interactionType,
                elementId,
                elementClass,
                elementText,
                pageUrl,
                additionalData ? JSON.stringify(additionalData) : null,
                timestamp
            ]
        );
    }

    // Form Submission Tracking
    async recordFormSubmission(formData) {
        const { sessionId, formId, formData: data, success, errorMessage, timestamp } = formData;
        return pool.run(
            `INSERT INTO form_submissions 
             (session_id, form_id, form_data, success, error_message, submission_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, formId, JSON.stringify(data), success, errorMessage, timestamp]
        );
    }

    // Error Logging
    async logError(errorData) {
        const {
            sessionId,
            errorType,
            errorMessage,
            stackTrace,
            pageUrl,
            additionalData,
            timestamp
        } = errorData;
        
        return pool.run(
            `INSERT INTO error_logs 
             (session_id, error_type, error_message, stack_trace, page_url, additional_data, error_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                sessionId,
                errorType,
                errorMessage,
                stackTrace,
                pageUrl,
                additionalData ? JSON.stringify(additionalData) : null,
                timestamp
            ]
        );
    }

    // Performance Metrics Recording
    async recordPerformanceMetrics(metricsData) {
        const {
            sessionId,
            pageUrl,
            loadTime,
            domInteractiveTime,
            domCompleteTime,
            firstPaintTime,
            firstContentfulPaintTime,
            timestamp
        } = metricsData;
        
        return pool.run(
            `INSERT INTO performance_metrics 
             (session_id, page_url, load_time, dom_interactive_time, dom_complete_time, 
              first_paint_time, first_contentful_paint_time, metric_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sessionId,
                pageUrl,
                loadTime,
                domInteractiveTime,
                domCompleteTime,
                firstPaintTime,
                firstContentfulPaintTime,
                timestamp
            ]
        );
    }

    // Query Operations
    async getSessionData(sessionId) {
        return pool.get(
            `SELECT * FROM user_sessions WHERE session_id = ?`,
            [sessionId]
        );
    }

    async getSessionInteractions(sessionId) {
        return pool.query(
            `SELECT * FROM user_interactions WHERE session_id = ? ORDER BY interaction_time DESC`,
            [sessionId]
        );
    }

    async getSessionFormSubmissions(sessionId) {
        return pool.query(
            `SELECT * FROM form_submissions WHERE session_id = ? ORDER BY submission_time DESC`,
            [sessionId]
        );
    }

    async getSessionErrors(sessionId) {
        return pool.query(
            `SELECT * FROM error_logs WHERE session_id = ? ORDER BY error_time DESC`,
            [sessionId]
        );
    }

    async getSessionPerformanceMetrics(sessionId) {
        return pool.query(
            `SELECT * FROM performance_metrics WHERE session_id = ? ORDER BY metric_time DESC`,
            [sessionId]
        );
    }

    // Analytics Queries
    async getActiveUsers() {
        return pool.get(
            `SELECT COUNT(DISTINCT session_id) as count 
             FROM user_sessions 
             WHERE end_time IS NULL 
             AND start_time > datetime('now', '-1 hour')`
        );
    }

    async getTotalSessions() {
        return pool.get(
            `SELECT COUNT(*) as count 
             FROM user_sessions 
             WHERE start_time > datetime('now', '-24 hours')`
        );
    }

    async getErrorCount() {
        return pool.get(
            `SELECT COUNT(*) as count 
             FROM error_logs 
             WHERE error_time > datetime('now', '-24 hours')`
        );
    }

    // Health Check
    async healthCheck() {
        const poolHealth = await pool.healthCheck();
        const dbStats = await this.getDatabaseStats();
        
        return {
            ...poolHealth,
            database: dbStats
        };
    }

    async getDatabaseStats() {
        const stats = await Promise.all([
            pool.get('SELECT COUNT(*) as sessions FROM user_sessions'),
            pool.get('SELECT COUNT(*) as interactions FROM user_interactions'),
            pool.get('SELECT COUNT(*) as errors FROM error_logs'),
            pool.get('SELECT COUNT(*) as metrics FROM performance_metrics')
        ]);

        return {
            sessions: stats[0].sessions,
            interactions: stats[1].interactions,
            errors: stats[2].errors,
            metrics: stats[3].metrics
        };
    }
}

module.exports = new DatabaseOperations(); 