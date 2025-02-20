const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class ABTestingManager {
    constructor() {
        this.activeTests = new Map();
        this.userAssignments = new Map();
    }

    /**
     * Create a new A/B test
     * @param {string} testId - Unique identifier for the test
     * @param {Object} config - Test configuration
     * @param {string[]} config.variants - Array of variant names
     * @param {Object} config.weights - Optional weights for variants (must sum to 1)
     * @param {Date} config.startDate - Test start date
     * @param {Date} config.endDate - Test end date
     * @param {Object} config.goals - Conversion goals to track
     */
    createTest(testId, config) {
        if (this.activeTests.has(testId)) {
            throw new Error(`Test with ID ${testId} already exists`);
        }

        const weights = config.weights || this._generateEqualWeights(config.variants.length);
        if (!this._validateWeights(weights)) {
            throw new Error('Variant weights must sum to 1');
        }

        this.activeTests.set(testId, {
            ...config,
            weights,
            results: this._initializeResults(config.variants)
        });

        return true;
    }

    /**
     * Assign a user to a test variant
     * @param {string} testId - Test identifier
     * @param {string} userId - User identifier
     * @returns {string} Assigned variant
     */
    assignUserToVariant(testId, userId) {
        const test = this.activeTests.get(testId);
        if (!test) {
            throw new Error(`Test ${testId} not found`);
        }

        // Check if user is already assigned
        const userKey = `${testId}:${userId}`;
        if (this.userAssignments.has(userKey)) {
            return this.userAssignments.get(userKey);
        }

        // Assign variant based on weights
        const variant = this._selectVariantByWeight(test.variants, test.weights);
        this.userAssignments.set(userKey, variant);

        // Record assignment in database
        this._recordAssignment(testId, userId, variant);

        return variant;
    }

    /**
     * Track a conversion event for a test
     * @param {string} testId - Test identifier
     * @param {string} userId - User identifier
     * @param {string} goalId - Goal identifier
     * @param {Object} metadata - Additional event metadata
     */
    async trackConversion(testId, userId, goalId, metadata = {}) {
        const test = this.activeTests.get(testId);
        if (!test) {
            throw new Error(`Test ${testId} not found`);
        }

        const variant = this.getUserVariant(testId, userId);
        if (!variant) {
            throw new Error(`User ${userId} not assigned to test ${testId}`);
        }

        await db.recordABTestConversion({
            testId,
            userId,
            variant,
            goalId,
            metadata,
            timestamp: new Date().toISOString()
        });

        // Update in-memory results
        test.results[variant].conversions[goalId] = (test.results[variant].conversions[goalId] || 0) + 1;
    }

    /**
     * Get test results
     * @param {string} testId - Test identifier
     * @returns {Object} Test results including conversion rates
     */
    async getTestResults(testId) {
        const test = this.activeTests.get(testId);
        if (!test) {
            throw new Error(`Test ${testId} not found`);
        }

        const results = await db.getABTestResults(testId);
        return this._calculateTestStatistics(results);
    }

    /**
     * Get variant assigned to a user
     * @param {string} testId - Test identifier
     * @param {string} userId - User identifier
     * @returns {string|null} Assigned variant or null
     */
    getUserVariant(testId, userId) {
        const userKey = `${testId}:${userId}`;
        return this.userAssignments.get(userKey) || null;
    }

    // Private helper methods
    _generateEqualWeights(count) {
        const weight = 1 / count;
        return Array(count).fill(weight);
    }

    _validateWeights(weights) {
        const sum = weights.reduce((a, b) => a + b, 0);
        return Math.abs(sum - 1) < 0.0001; // Allow for floating point imprecision
    }

    _selectVariantByWeight(variants, weights) {
        const random = Math.random();
        let sum = 0;
        
        for (let i = 0; i < variants.length; i++) {
            sum += weights[i];
            if (random <= sum) {
                return variants[i];
            }
        }
        
        return variants[variants.length - 1]; // Fallback to last variant
    }

    _initializeResults(variants) {
        const results = {};
        variants.forEach(variant => {
            results[variant] = {
                participants: 0,
                conversions: {}
            };
        });
        return results;
    }

    async _recordAssignment(testId, userId, variant) {
        await db.recordABTestAssignment({
            testId,
            userId,
            variant,
            timestamp: new Date().toISOString()
        });

        // Update in-memory results
        const test = this.activeTests.get(testId);
        test.results[variant].participants++;
    }

    _calculateTestStatistics(results) {
        // Implementation of statistical calculations (conversion rates, confidence intervals, etc.)
        // This would include calculations for:
        // - Conversion rates per variant
        // - Confidence intervals
        // - Statistical significance
        // - Lift over control
        return {
            ...results,
            statistics: {
                // Add statistical calculations here
            }
        };
    }
}

// Create and export singleton instance
const abTestingManager = new ABTestingManager();
module.exports = abTestingManager; 