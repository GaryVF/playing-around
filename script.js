// Global variables
let mapInstance = null;
let loadingScreen = null;
let isInitialized = false;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.warn('Application already initialized');
        return;
    }

    // Create and setup loading screen first
    setupLoadingScreen();

    // Initialize loading sequence
    const loadingTasks = [
        new Promise(resolve => setTimeout(resolve, 1500))
    ];

    // Initialize map if container exists
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        loadingTasks.push(initializeMap(mapContainer));
    }

    // Execute all loading tasks
    Promise.all(loadingTasks)
        .then(finishLoading)
        .catch(handleLoadingError);

    isInitialized = true;
}

function setupLoadingScreen() {
    // Remove any existing loading screen
    const existingScreen = document.querySelector('.loading-screen');
    if (existingScreen) {
        existingScreen.parentNode.removeChild(existingScreen);
    }

    // Create new loading screen
    loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    loadingScreen.style.zIndex = '9999';
    loadingScreen.style.transition = 'opacity 0.5s ease';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    
    // Add loading indicator
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = '<span class="loader-text">Loading...</span>';
    loadingScreen.appendChild(loader);

    document.body.appendChild(loadingScreen);
    document.body.classList.add('loading');
}

function initializeMap(container) {
    return new Promise((resolve, reject) => {
        try {
            // Clean up existing map if it exists
            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }

            // Clear the container
            container.innerHTML = '';

            // Create new map instance
            mapInstance = L.map(container, {
                center: [40.7128, -74.0060],
                zoom: 13,
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                touchZoom: false,
                doubleClickZoom: false
            });

            // Add tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: null,
                maxZoom: 19
            }).addTo(mapInstance).on('load', () => {
                setupMapFeatures(container);
                resolve();
            });

        } catch (error) {
            console.error('Map initialization error:', error);
            reject(error);
        }
    });
}

function setupMapFeatures(container) {
    if (!mapInstance || mapInstance._removed) return;

    // Add animated location markers
    const locations = [
        { lat: 40.7128, lng: -74.0060, title: "New York" },
        { lat: 40.7142, lng: -74.0119, title: "Manhattan" },
        { lat: 40.7082, lng: -74.0037, title: "Financial District" }
    ];

    const markers = [];
    const intervals = [];

    locations.forEach((loc, index) => {
        setTimeout(() => {
            if (!mapInstance || mapInstance._removed) return;

            const marker = L.circle([loc.lat, loc.lng], {
                color: '#2979FF',
                fillColor: '#00E5FF',
                fillOpacity: 0.5,
                radius: 300
            }).addTo(mapInstance);

            markers.push(marker);

            // Pulse animation
            function pulseMarker() {
                if (!marker || !mapInstance || mapInstance._removed) return;
                marker.setStyle({ radius: 300 });
                setTimeout(() => {
                    if (!marker || !mapInstance || mapInstance._removed) return;
                    marker.setStyle({ radius: 500 });
                    setTimeout(() => {
                        if (!marker || !mapInstance || mapInstance._removed) return;
                        marker.setStyle({ radius: 300 });
                    }, 1000);
                }, 1000);
            }

            const pulseInterval = setInterval(pulseMarker, 2000);
            intervals.push(pulseInterval);

        }, index * 1000);
    });

    // Setup map animation
    let direction = 1;
    function animateMap() {
        if (!mapInstance || mapInstance._removed) return;
        
        const center = mapInstance.getCenter();
        const newLat = center.lat + (0.0001 * direction);
        const newLng = center.lng + (0.0001 * direction);
        
        mapInstance.panTo([newLat, newLng], {
            animate: true,
            duration: 15
        });
        
        direction *= -1;
    }

    const animationInterval = setInterval(animateMap, 15000);

    // Setup scroll handler
    const scrollHandler = () => {
        if (!container || !mapInstance || mapInstance._removed) return;
        requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            container.style.transform = `scale(${1 + scrolled * 0.0005})`;
        });
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Cleanup function
    mapInstance.on('remove', () => {
        intervals.forEach(clearInterval);
        clearInterval(animationInterval);
        window.removeEventListener('scroll', scrollHandler);
        markers.forEach(marker => {
            if (marker && mapInstance) {
                marker.remove();
            }
        });
    });

    // Make map visible
    requestAnimationFrame(() => {
        if (container) {
            container.style.display = 'block';
            container.style.animation = 'subtle-zoom 30s infinite alternate';
        }
    });

    // Force a map refresh
    setTimeout(() => {
        if (mapInstance && !mapInstance._removed) {
            mapInstance.invalidateSize();
        }
    }, 100);
}

function finishLoading() {
    if (!loadingScreen) return;

    requestAnimationFrame(() => {
        document.body.classList.remove('loading');
        loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
                loadingScreen = null;
            }
        }, 500);
    });
}

function handleLoadingError(error) {
    console.error('Loading error:', error);
    
    // Clean up map if it failed
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    // Remove loading screen
    finishLoading();

    // Show error to user
    showErrorNotification('Failed to load the application. Please refresh the page.');
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px';
    notification.style.backgroundColor = '#ff3d00';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '10000';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Mobile Menu Functionality
const menuBtn = document.querySelector('.mobile-menu-btn');
const body = document.body;
const mobileMenuLinks = document.querySelectorAll('.mobile-menu-content a');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        body.classList.toggle('menu-open');
    });

    // Close menu when clicking a link
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            body.classList.remove('menu-open');
        });
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (body.classList.contains('menu-open') && 
        !e.target.closest('.mobile-menu-content') && 
        !e.target.closest('.mobile-menu-btn')) {
        body.classList.remove('menu-open');
    }
});

// Add smooth scrolling to all navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize scroll animations
initScrollAnimations();

// Initialize testimonials carousel after DOM load
initTestimonialsCarousel();

// Initialize performance optimizations
initPerformanceOptimizations();

// Initialize form handling
initFormHandling();

// Initialize progressive image loading
initProgressiveImageLoading();

// Initialize keyboard navigation
initKeyboardNavigation();

// Initialize error boundary
initErrorBoundary();

// Initialize analytics dashboard immediately
initAnalyticsDashboard();

// Initialize tracking system
const tracking = {
    sessionId: null,

    async init() {
        // Set up performance observer
        this.initPerformanceObserver();
        
        // Track initial page load
        this.trackPageLoad();
        
        // Set up interaction tracking
        this.initInteractionTracking();
        
        // Track form submissions
        this.initFormTracking();
    },

    initPerformanceObserver() {
        // Performance metrics tracking
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Track only paint timing metrics
                if (entry.entryType === 'paint') {
                    this.trackPerformanceMetric(entry.name, entry.startTime);
                }
            }
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

        // Track page load metrics
        window.addEventListener('load', () => {
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            const metrics = {
                pageUrl: window.location.pathname,
                loadTime: navigationEntry.loadEventEnd,
                domInteractiveTime: navigationEntry.domInteractive,
                domCompleteTime: navigationEntry.domComplete,
                firstPaintTime: performance.getEntriesByName('first-paint')[0]?.startTime,
                firstContentfulPaintTime: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
            };

            this.sendToServer('/api/track/performance', metrics);
        });
    },

    initInteractionTracking() {
        // Track clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            this.trackInteraction('click', target);
        });

        // Track form field interactions
        document.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.trackInteraction('focus', e.target);
            }
        }, true);

        // Track scrolling
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollDepth = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
                this.trackInteraction('scroll', null, { scrollDepth });
            }, 150);
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.trackInteraction('visibility_change', null, {
                state: document.visibilityState
            });
        });
    },

    initFormTracking() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Track form field changes
            form.addEventListener('input', (e) => {
                if (e.target.type !== 'password') {
                    this.trackInteraction('form_input', e.target, {
                        fieldName: e.target.name,
                        fieldType: e.target.type
                    });
                }
            });

            // Track form submissions
            form.addEventListener('submit', (e) => {
                this.trackInteraction('form_submit', e.target, {
                    formId: e.target.id
                });
            });
        });
    },

    trackPageLoad() {
        const pageData = {
            url: window.location.pathname,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        };

        this.trackInteraction('page_load', null, pageData);
    },

    trackInteraction(type, element, additionalData = {}) {
        const interactionData = {
            interactionType: type,
            elementId: element?.id || null,
            elementClass: element?.className || null,
            elementText: element?.textContent?.trim() || null,
            pageUrl: window.location.pathname,
            timestamp: new Date().toISOString(),
            ...additionalData
        };

        this.sendToServer('/api/track/interaction', interactionData);
    },

    trackPerformanceMetric(name, value) {
        const metricData = {
            pageUrl: window.location.pathname,
            metricName: name,
            metricValue: value,
            timestamp: new Date().toISOString()
        };

        this.sendToServer('/api/track/performance', metricData);
    },

    async sendToServer(endpoint, data) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.sessionId) {
                headers['X-Session-Id'] = this.sessionId;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Store session ID from first response
            if (!this.sessionId) {
                this.sessionId = response.headers.get('X-Session-Id');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to send tracking data:', error);
        }
    }
};

// Initialize tracking
tracking.init();

// Scroll-based Animations
function initScrollAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px"
    };

    const fadeInElements = document.querySelectorAll('.feature-card, .about-text, .about-stats, .contact-content');
    
    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeInElements.forEach(element => {
        element.classList.add('fade-element');
        fadeInObserver.observe(element);
    });

    // Parallax effect for sections
    const parallaxSections = document.querySelectorAll('.features, .about, .contact');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;

        parallaxSections.forEach(section => {
            const speed = 0.5;
            const sectionTop = section.offsetTop;
            const distance = scrolled - sectionTop;
            
            if (Math.abs(distance) < window.innerHeight) {
                section.style.transform = `translateY(${distance * speed * 0.1}px)`;
            }
        });

        // Update map scale based on scroll
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            const scrollProgress = Math.min(scrolled / (document.documentElement.scrollHeight - window.innerHeight), 1);
            const scale = 1 + (scrollProgress * 0.1);
            mapContainer.style.transform = `scale(${scale})`;
            mapContainer.style.filter = `brightness(${0.9 - scrollProgress * 0.3}) saturate(1.2) contrast(1.1)`;
        }

        // Animate statistics when in view
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            if (isElementInViewport(stat) && !stat.classList.contains('animated')) {
                animateNumber(stat);
                stat.classList.add('animated');
            }
        });
    });
}

// Helper function to check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
}

// Animate numbers function
function animateNumber(element) {
    const target = parseInt(element.textContent);
    let current = 0;
    const increment = target / 50; // Adjust speed here
    const duration = 1500; // Animation duration in milliseconds
    const stepTime = duration / 50;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + (element.textContent.includes('+') ? '+' : '');
        }
    }, stepTime);
}

// Testimonials Carousel
function initTestimonialsCarousel() {
    const track = document.querySelector('.testimonial-track');
    const cards = document.querySelectorAll('.testimonial-card');
    const dotsContainer = document.querySelector('.carousel-dots');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    
    let currentIndex = 0;
    
    // Create dots
    cards.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    // Update track transform
    function updateTrack() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    // Navigation functions
    function goToSlide(index) {
        currentIndex = index;
        updateTrack();
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % cards.length;
        updateTrack();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
        updateTrack();
    }
    
    // Event listeners
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    
    // Auto-advance carousel
    setInterval(nextSlide, 5000);
    
    // Touch support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    track.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) {
            nextSlide();
        } else if (touchEndX - touchStartX > 50) {
            prevSlide();
        }
    });
}

// Performance Optimizations
function initPerformanceOptimizations() {
    // Lazy load images
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));

    // Debounce scroll events
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Optimize scroll handlers
    const optimizedScroll = debounce(() => {
        const scrolled = window.pageYOffset;
        const mapContainer = document.getElementById('map');
        
        if (mapContainer) {
            requestAnimationFrame(() => {
                mapContainer.style.transform = `scale(${1 + scrolled * 0.0005})`;
                mapContainer.style.filter = `brightness(${0.9 - scrolled * 0.3}) saturate(1.2) contrast(1.1)`;
            });
        }
    }, 10);

    window.addEventListener('scroll', optimizedScroll, { passive: true });

    // Optimize map tiles loading
    const mapTiles = document.querySelectorAll('.leaflet-tile');
    mapTiles.forEach(tile => {
        tile.loading = 'lazy';
    });

    // Cache DOM elements
    const cachedElements = new Map();
    function getElement(selector) {
        if (!cachedElements.has(selector)) {
            cachedElements.set(selector, document.querySelector(selector));
        }
        return cachedElements.get(selector);
    }

    // Preload critical resources
    function preloadCriticalResources() {
        const resources = [
            '/path/to/critical/image1.jpg',
            '/path/to/critical/image2.jpg'
        ];

        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = resource;
            document.head.appendChild(link);
        });
    }

    // Initialize performance monitoring
    function initPerformanceMonitoring() {
        if ('performance' in window) {
            window.performance.mark('app-ready');
            
            // Monitor critical metrics
            const metrics = {
                FCP: 0,
                LCP: 0,
                CLS: 0
            };

            // First Contentful Paint
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                metrics.FCP = entries[entries.length - 1].startTime;
                console.log('FCP:', metrics.FCP);
            }).observe({ entryTypes: ['paint'] });

            // Largest Contentful Paint
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                metrics.LCP = entries[entries.length - 1].startTime;
                console.log('LCP:', metrics.LCP);
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // Cumulative Layout Shift
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    metrics.CLS += entry.value;
                }
                console.log('CLS:', metrics.CLS);
            }).observe({ entryTypes: ['layout-shift'] });
        }
    }

    // Initialize optimizations
    preloadCriticalResources();
    initPerformanceMonitoring();
}

// Form Handling
function initFormHandling() {
    const form = document.getElementById('contactForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = form.querySelector('.submit-button');
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="button-loader"></span>
            <span>Sending...</span>
        `;

        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to submit form');
            }

            const result = await response.json();
            showNotification('Message sent successfully!', 'success');
            form.reset();
        } catch (error) {
            showNotification('Failed to send message. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <span class="button-text">Send Message</span>
                <span class="button-icon">→</span>
            `;
        }
    });

    enhanceFormAccessibility();

    // Initialize form analytics
    initFormAnalytics();
}

// Progressive Image Loading
function initProgressiveImageLoading() {
    // Create blur-up effect for images
    const blurUpImages = document.querySelectorAll('img[data-src]');
    
    // Create low-quality placeholder
    function createPlaceholder(width, height) {
        return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3C/svg%3E`;
    }

    // Load image progressively
    function loadImage(img) {
        const fullSrc = img.dataset.src;
        
        // Create new image object
        const newImage = new Image();
        newImage.src = fullSrc;
        
        // Add loading class
        img.classList.add('loading');
        
        // When full image loads
        newImage.onload = () => {
            img.src = fullSrc;
            img.classList.remove('loading');
            img.classList.add('loaded');
        };
    }

    // Intersection Observer for images
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });

    // Observe all images
    blurUpImages.forEach(image => {
        // Set initial placeholder
        const width = image.getAttribute('width') || 100;
        const height = image.getAttribute('height') || 100;
        image.src = createPlaceholder(width, height);
        
        // Start observing
        imageObserver.observe(image);
    });

    // Add loading states for interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
    
    interactiveElements.forEach(element => {
        element.addEventListener('click', () => {
            element.classList.add('interacting');
        });
        
        element.addEventListener('blur', () => {
            element.classList.remove('interacting');
        });
    });

    // Add loading indicator for background images
    const elementsWithBgImage = document.querySelectorAll('[data-bg-src]');
    
    elementsWithBgImage.forEach(element => {
        const bgUrl = element.dataset.bgSrc;
        element.style.backgroundImage = `url(${createPlaceholder(100, 100)})`;
        
        const img = new Image();
        img.src = bgUrl;
        
        img.onload = () => {
            element.style.backgroundImage = `url(${bgUrl})`;
            element.classList.add('bg-loaded');
        };
    });
}

// Add to Form Handling function
function enhanceFormAccessibility() {
    const form = document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input, select, textarea');

    // Add keyboard navigation
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const nextInput = inputs[index + 1];
                if (nextInput) {
                    nextInput.focus();
                } else {
                    form.querySelector('button[type="submit"]').focus();
                }
            }
        });
    });

    // Live validation feedback
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const errorElement = document.getElementById(`${input.id}-error`);
            const isValid = input.checkValidity();
            
            input.setAttribute('aria-invalid', !isValid);
            errorElement.setAttribute('aria-hidden', isValid);
            
            if (!isValid) {
                let errorMessage = '';
                if (input.validity.valueMissing) {
                    errorMessage = `${input.labels[0].textContent.replace(':', '')} is required`;
                } else if (input.validity.typeMismatch && input.type === 'email') {
                    errorMessage = 'Please enter a valid email address';
                }
                errorElement.textContent = errorMessage;
                input.setAttribute('aria-describedby', `${input.id}-error`);
            }
        });

        // Announce validation on blur
        input.addEventListener('blur', () => {
            if (!input.checkValidity()) {
                const errorElement = document.getElementById(`${input.id}-error`);
                errorElement.setAttribute('role', 'alert');
            }
        });
    });

    // Focus management
    form.addEventListener('submit', () => {
        const successMessage = document.querySelector('.notification.success');
        if (successMessage) {
            successMessage.setAttribute('role', 'alert');
            successMessage.focus();
        }
    });
}

// Form Analytics
function initFormAnalytics() {
    const form = document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    // Analytics data structure
    const analytics = {
        formInteractions: 0,
        fieldInteractions: {},
        completionRate: 0,
        errorRate: 0,
        averageCompletionTime: 0,
        submissions: 0,
        errors: 0
    };

    let startTime = null;

    // Track form focus
    form.addEventListener('focusin', () => {
        if (!startTime) {
            startTime = Date.now();
            trackEvent('form_start');
        }
    });

    // Track field interactions
    inputs.forEach(input => {
        analytics.fieldInteractions[input.id] = 0;

        input.addEventListener('focus', () => {
            trackEvent('field_focus', { field: input.id });
        });

        input.addEventListener('input', () => {
            analytics.fieldInteractions[input.id]++;
            trackEvent('field_interaction', { 
                field: input.id,
                interactionCount: analytics.fieldInteractions[input.id]
            });
        });

        input.addEventListener('blur', () => {
            trackEvent('field_blur', { 
                field: input.id,
                isValid: input.checkValidity()
            });
        });
    });

    // Track form submission attempts
    form.addEventListener('submit', (e) => {
        const completionTime = Date.now() - startTime;
        analytics.submissions++;
        
        const formData = new FormData(form);
        const isValid = validateForm(formData).length === 0;

        if (!isValid) {
            analytics.errors++;
            analytics.errorRate = analytics.errors / analytics.submissions;
        }

        analytics.averageCompletionTime = completionTime;
        analytics.completionRate = (analytics.submissions - analytics.errors) / analytics.submissions;

        trackEvent('form_submit', {
            isValid,
            completionTime,
            errorRate: analytics.errorRate,
            completionRate: analytics.completionRate
        });
    });

    // Track validation errors
    function trackValidationError(field, errorType) {
        trackEvent('validation_error', {
            field,
            errorType,
            errorCount: analytics.errors
        });
    }

    // Generic event tracking function
    function trackEvent(eventName, eventData = {}) {
        // Add timestamp to all events
        const event = {
            timestamp: new Date().toISOString(),
            event: eventName,
            ...eventData
        };

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Form Analytics:', event);
        }

        // Send to analytics service (example implementation)
        try {
            // Replace with your actual analytics service
            sendToAnalytics(event);
        } catch (error) {
            console.error('Analytics Error:', error);
        }
    }

    // Example analytics service integration
    function sendToAnalytics(event) {
        // Simulated analytics API call
        // Replace with your actual analytics service implementation
        const analyticsEndpoint = 'https://analytics.enroute.io/events';
        
        fetch(analyticsEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }).catch(error => {
            console.error('Failed to send analytics:', error);
        });
    }
}

// Keyboard Navigation
function initKeyboardNavigation() {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key handling
        if (e.key === 'Escape') {
            const mobileMenu = document.querySelector('.mobile-menu-overlay');
            if (mobileMenu && mobileMenu.classList.contains('visible')) {
                closeMobileMenu();
            }
            
            const notifications = document.querySelectorAll('.notification');
            notifications.forEach(notification => notification.remove());
        }

        // Navigation shortcuts
        if (e.altKey) {
            switch(e.key) {
                case 'h': // Home
                    scrollToSection('hero');
                    break;
                case 'f': // Features
                    scrollToSection('features');
                    break;
                case 'c': // Contact
                    scrollToSection('contact');
                    break;
            }
        }
    });

    // Focus trap for mobile menu
    const mobileMenu = document.querySelector('.mobile-menu-overlay');
    if (mobileMenu) {
        const focusableContent = mobileMenu.querySelectorAll(focusableElements);
        const firstFocusable = focusableContent[0];
        const lastFocusable = focusableContent[focusableContent.length - 1];

        mobileMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    // Enhanced focus management
    document.querySelectorAll(focusableElements).forEach(element => {
        element.addEventListener('focus', () => {
            element.classList.add('keyboard-focus');
        });

        element.addEventListener('blur', () => {
            element.classList.remove('keyboard-focus');
        });

        // Skip animations on keyboard navigation
        element.addEventListener('keydown', () => {
            element.classList.add('no-animation');
        });

        element.addEventListener('mousemove', () => {
            element.classList.remove('no-animation');
        });
    });

    // Section navigation
    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            section.focus();
        }
    }

    // Add skip links
    const skipLink = document.createElement('a');
    skipLink.className = 'skip-link';
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
}

// Error Boundary Handler
function initErrorBoundary() {
    // Global error handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        handleError({
            type: 'global',
            message: msg,
            location: url,
            line: lineNo,
            column: columnNo,
            error: error,
            stack: error?.stack
        });
        return false;
    };

    // Promise rejection handler
    window.onunhandledrejection = function(event) {
        handleError({
            type: 'promise',
            message: event.reason?.message || 'Promise rejected',
            error: event.reason
        });
    };

    // Custom error handler
    function handleError(errorDetails) {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by boundary:', errorDetails);
        }

        // Send error to monitoring service
        sendErrorReport(errorDetails);

        // Show user-friendly error message
        showErrorNotification(errorDetails);

        // Attempt recovery
        attemptRecovery(errorDetails);
    }

    // Error reporting service
    function sendErrorReport(error) {
        const errorEndpoint = 'https://monitoring.enroute.io/errors';
        
        fetch(errorEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ...error
            })
        }).catch(err => {
            console.error('Failed to send error report:', err);
        });
    }

    // User-friendly error notification
    function showErrorNotification(error) {
        const message = getUserFriendlyMessage(error);
        
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">!</span>
                <div class="error-details">
                    <p class="error-message">${message}</p>
                    ${error.type === 'form' ? '<button class="retry-button">Try Again</button>' : ''}
                </div>
            </div>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;

        const container = document.querySelector('.notification-container') || 
            document.createElement('div');
        
        if (!document.querySelector('.notification-container')) {
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Add event listeners
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        const retryButton = notification.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                notification.remove();
                retryFailedOperation(error);
            });
        }

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            notification.remove();
        }, 10000);
    }

    // Get user-friendly error message
    function getUserFriendlyMessage(error) {
        const messages = {
            network: 'Connection error. Please check your internet connection.',
            form: 'There was a problem submitting the form. Please try again.',
            map: 'Unable to load map data. Please refresh the page.',
            api: 'Service temporarily unavailable. Please try again later.',
            default: 'An unexpected error occurred. Please try again.'
        };

        return messages[error.type] || messages.default;
    }

    // Recovery attempts
    function attemptRecovery(error) {
        switch(error.type) {
            case 'map':
                // Retry map initialization
                initializeMap();
                break;
            case 'network':
                // Check connection and retry failed requests
                retryFailedRequests();
                break;
            case 'form':
                // Reset form to last valid state
                resetFormState();
                break;
            default:
                // Basic recovery - refresh required resources
                reloadCriticalResources();
        }
    }

    // Add error boundary to specific features
    function addFeatureErrorBoundary(featureFunction, type) {
        return function(...args) {
            try {
                return featureFunction.apply(this, args);
            } catch (error) {
                handleError({
                    type,
                    message: error.message,
                    error
                });
            }
        };
    }

    // Wrap critical functions with error boundary
    window.initializeMap = addFeatureErrorBoundary(initializeMap, 'map');
    window.initFormHandling = addFeatureErrorBoundary(initFormHandling, 'form');
}

// Analytics Dashboard
function initAnalyticsDashboard() {
    console.log('Initializing analytics dashboard...'); // Debug log

    // Find existing toggle button
    const toggleButton = document.querySelector('.dashboard-toggle');
    if (!toggleButton) {
        console.error('Analytics toggle button not found');
        return;
    }

    // Create dashboard container
    const dashboard = document.createElement('div');
    dashboard.className = 'analytics-dashboard';
    dashboard.innerHTML = `
        <div class="dashboard-header">
            <h2>Analytics Dashboard</h2>
            <div class="dashboard-controls">
                <select id="timeRange">
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                </select>
                <button class="refresh-btn">Refresh</button>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="metric-card">
                <h3>Form Submissions</h3>
                <div class="metric-value" id="submissionCount">0</div>
                <div class="metric-chart" id="submissionsChart"></div>
            </div>
            <div class="metric-card">
                <h3>Conversion Rate</h3>
                <div class="metric-value" id="conversionRate">0%</div>
                <div class="metric-chart" id="conversionChart"></div>
            </div>
            <div class="metric-card">
                <h3>Error Rate</h3>
                <div class="metric-value" id="errorRate">0%</div>
                <div class="metric-chart" id="errorChart"></div>
            </div>
            <div class="metric-card">
                <h3>Avg. Completion Time</h3>
                <div class="metric-value" id="avgTime">0s</div>
                <div class="metric-chart" id="timeChart"></div>
            </div>
        </div>
        <div class="dashboard-details">
            <div class="interaction-map">
                <h3>Field Interaction Heat Map</h3>
                <div id="heatMap"></div>
            </div>
            <div class="error-log">
                <h3>Recent Errors</h3>
                <div id="errorLog"></div>
            </div>
        </div>
    `;

    // Add dashboard to page
    document.body.appendChild(dashboard);

    // Add click handler
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dashboard.classList.toggle('open');
        this.classList.toggle('active');
        console.log('Dashboard toggled'); // Debug log
    });

    // Close dashboard when clicking outside
    document.addEventListener('click', function(e) {
        if (!dashboard.contains(e.target) && !toggleButton.contains(e.target)) {
            dashboard.classList.remove('open');
            toggleButton.classList.remove('active');
        }
    });

    // Initialize charts only when dashboard is first opened
    let chartsInitialized = false;
    toggleButton.addEventListener('click', function() {
        if (!chartsInitialized && dashboard.classList.contains('open')) {
            initCharts();
            setupRealtimeUpdates();
            chartsInitialized = true;
        }
    });
}

function initCharts() {
    // Example chart initialization using Chart.js
    const charts = {
        submissions: new Chart(document.getElementById('submissionsChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Submissions',
                    data: [],
                    borderColor: 'var(--primary-green)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }),
        // ... initialize other charts similarly
    };

    return charts;
}

function setupRealtimeUpdates() {
    // Poll for new analytics data
    setInterval(async () => {
        try {
            const data = await fetchAnalyticsData();
            updateDashboard(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    }, 30000); // Update every 30 seconds
}

async function fetchAnalyticsData() {
    // Fetch data from analytics API
    const response = await fetch('https://analytics.enroute.io/api/dashboard');
    return response.json();
}

function updateDashboard(data) {
    // Update metrics
    document.getElementById('submissionCount').textContent = data.submissions;
    document.getElementById('conversionRate').textContent = `${data.conversionRate}%`;
    document.getElementById('errorRate').textContent = `${data.errorRate}%`;
    document.getElementById('avgTime').textContent = `${data.avgCompletionTime}s`;

    // Update charts
    updateCharts(data);
    
    // Update heat map
    updateHeatMap(data.fieldInteractions);
    
    // Update error log
    updateErrorLog(data.recentErrors);
}

function updateCharts(data) {
    // Implementation of updateCharts function
}

function updateHeatMap(fieldInteractions) {
    // Implementation of updateHeatMap function
}

function updateErrorLog(recentErrors) {
    // Implementation of updateErrorLog function
} 