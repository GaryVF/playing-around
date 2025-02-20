class ABTesting {
    constructor() {
        this.variants = new Map();
        this.conversionTrackers = new Map();
    }

    /**
     * Get the variant for a specific test
     * @param {string} testId - The test identifier
     * @returns {Promise<string>} The assigned variant
     */
    async getVariant(testId) {
        // Check cache first
        if (this.variants.has(testId)) {
            return this.variants.get(testId);
        }

        try {
            const response = await fetch(`/api/ab-tests/${testId}/variant`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.variants.set(testId, data.variant);
            return data.variant;
        } catch (error) {
            console.error('Failed to get test variant:', error);
            throw error;
        }
    }

    /**
     * Track a conversion for a specific test and goal
     * @param {string} testId - The test identifier
     * @param {string} goalId - The goal identifier
     * @param {Object} metadata - Additional metadata about the conversion
     */
    async trackConversion(testId, goalId, metadata = {}) {
        try {
            const response = await fetch(`/api/ab-tests/${testId}/conversion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ goalId, metadata })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to track conversion:', error);
            throw error;
        }
    }

    /**
     * Set up automatic conversion tracking for specific elements
     * @param {string} testId - The test identifier
     * @param {string} goalId - The goal identifier
     * @param {string} selector - CSS selector for elements to track
     * @param {string} event - Event to listen for (e.g., 'click', 'submit')
     * @param {Function} metadataFn - Optional function to generate metadata
     */
    setupConversionTracking(testId, goalId, selector, event = 'click', metadataFn = null) {
        const key = `${testId}:${goalId}:${selector}:${event}`;
        
        // Remove existing listener if any
        if (this.conversionTrackers.has(key)) {
            const { elements, listener } = this.conversionTrackers.get(key);
            elements.forEach(el => el.removeEventListener(event, listener));
        }

        // Set up new listener
        const elements = Array.from(document.querySelectorAll(selector));
        const listener = async (e) => {
            try {
                const metadata = metadataFn ? await metadataFn(e) : {};
                await this.trackConversion(testId, goalId, metadata);
            } catch (error) {
                console.error('Error in conversion tracking:', error);
            }
        };

        elements.forEach(el => el.addEventListener(event, listener));
        this.conversionTrackers.set(key, { elements, listener });
    }

    /**
     * Apply variant-specific changes to the page
     * @param {string} testId - The test identifier
     * @param {Object} variantConfigs - Configuration for each variant
     */
    async applyVariant(testId, variantConfigs) {
        try {
            const variant = await this.getVariant(testId);
            const config = variantConfigs[variant];
            
            if (!config) {
                console.warn(`No configuration found for variant: ${variant}`);
                return;
            }

            // Apply the variant configuration
            if (typeof config === 'function') {
                await config();
            } else if (config.styles) {
                Object.entries(config.styles).forEach(([selector, styles]) => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        Object.assign(el.style, styles);
                    });
                });
            }

            if (config.content) {
                Object.entries(config.content).forEach(([selector, content]) => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (typeof content === 'function') {
                            el.innerHTML = content(el.innerHTML);
                        } else {
                            el.innerHTML = content;
                        }
                    });
                });
            }

            if (config.attributes) {
                Object.entries(config.attributes).forEach(([selector, attrs]) => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        Object.entries(attrs).forEach(([attr, value]) => {
                            el.setAttribute(attr, value);
                        });
                    });
                });
            }

            // Set up any conversion tracking specified in the config
            if (config.conversions) {
                Object.entries(config.conversions).forEach(([goalId, tracking]) => {
                    this.setupConversionTracking(
                        testId,
                        goalId,
                        tracking.selector,
                        tracking.event,
                        tracking.metadata
                    );
                });
            }

        } catch (error) {
            console.error('Failed to apply variant:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
window.abTesting = new ABTesting(); 