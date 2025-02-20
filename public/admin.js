// Admin Authentication
const validCredentials = {
    email: 'admin@test.com',
    password: 'test123'
};

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// Modal Elements
const sessionDetailsModal = document.getElementById('sessionDetailsModal');
const closeModalBtn = document.querySelector('.close-modal');

// Check authentication on page load
function checkAuth() {
    console.log('Checking authentication...');
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
        console.log('User is authenticated, showing dashboard');
        showDashboard();
    } else {
        console.log('User is not authenticated, showing login');
        showLogin();
    }
}

function showLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    loadDashboardData();
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);

async function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Login form submitted');
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Checking credentials...');
    
    if (email === validCredentials.email && password === validCredentials.password) {
        console.log('Login successful');
        sessionStorage.setItem('isAuthenticated', 'true');
        showDashboard();
    } else {
        console.log('Login failed');
        alert('Invalid credentials. Please try again.');
        emailInput.value = '';
        passwordInput.value = '';
    }
}

logoutBtn.addEventListener('click', () => {
    console.log('Logging out...');
    sessionStorage.removeItem('isAuthenticated');
    showLogin();
});

// Dashboard Data Functions
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    try {
        const [metricsData, sessionsData, interactionsData, errorsData] = await Promise.all([
            fetch('/api/analytics/overview').then(res => res.json()),
            fetch('/api/analytics/sessions').then(res => res.json()),
            fetch('/api/analytics/interactions').then(res => res.json()),
            fetch('/api/analytics/errors').then(res => res.json())
        ]);

        console.log('Dashboard data loaded:', { metricsData, sessionsData, interactionsData, errorsData });

        updateMetrics(metricsData);
        updateSessions(sessionsData);
        updateInteractions(interactionsData);
        updateErrors(errorsData);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateMetrics(data) {
    document.getElementById('activeSessions').textContent = data.activeUsers || '0';
    document.getElementById('totalInteractions').textContent = data.totalSessions || '0';
    document.getElementById('formSubmissions').textContent = data.formSubmissions || '0';
    document.getElementById('errorRate').textContent = `${data.errorRate || '0'}%`;
}

function updateSessions(sessions) {
    const tbody = document.querySelector('#sessionsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = (sessions || []).map(session => `
        <tr>
            <td>${session.session_id || 'N/A'}</td>
            <td>${formatDateTime(session.start_time)}</td>
            <td>${session.platform || 'N/A'}</td>
            <td>${session.browser || 'N/A'}</td>
            <td>${session.end_time ? 'Ended' : 'Active'}</td>
            <td>
                <button class="btn-secondary" onclick="viewSessionDetails('${session.session_id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function updateInteractions(interactions) {
    const tbody = document.querySelector('#interactionsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = (interactions || []).map(interaction => `
        <tr>
            <td>${formatDateTime(interaction.interaction_time)}</td>
            <td>${interaction.interaction_type || 'N/A'}</td>
            <td>${interaction.element_id || 'N/A'}</td>
            <td>${interaction.page_url || 'N/A'}</td>
            <td>${interaction.session_id || 'N/A'}</td>
        </tr>
    `).join('');
}

function updateErrors(errors) {
    const tbody = document.querySelector('#errorsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = (errors || []).map(error => `
        <tr>
            <td>${formatDateTime(error.error_time)}</td>
            <td>${error.error_type || 'N/A'}</td>
            <td>${error.error_message || 'N/A'}</td>
            <td>${error.page_url || 'N/A'}</td>
            <td>${error.session_id || 'N/A'}</td>
        </tr>
    `).join('');
}

// Utility Functions
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return date.toLocaleString('en-US', options);
}

// Close modal when clicking the close button or outside the modal
closeModalBtn.addEventListener('click', () => {
    sessionDetailsModal.classList.remove('show');
});

sessionDetailsModal.addEventListener('click', (e) => {
    if (e.target === sessionDetailsModal) {
        sessionDetailsModal.classList.remove('show');
    }
});

async function viewSessionDetails(sessionId) {
    console.log('Viewing session:', sessionId);
    try {
        // Fetch session details
        const [sessionResponse, interactionsResponse, errorsResponse] = await Promise.all([
            fetch(`/api/analytics/sessions/${sessionId}`),
            fetch(`/api/analytics/interactions?session_id=${sessionId}`),
            fetch(`/api/analytics/errors?session_id=${sessionId}`)
        ]);

        // Check if session exists
        if (!sessionResponse.ok) {
            throw new Error(`Session not found (${sessionResponse.status})`);
        }

        // Parse responses
        const [sessionData, interactions, errors] = await Promise.all([
            sessionResponse.json(),
            interactionsResponse.json(),
            errorsResponse.json()
        ]);

        // Update session information
        document.getElementById('detailSessionId').textContent = sessionId;
        document.getElementById('detailStartTime').textContent = formatDateTime(sessionData.start_time);
        document.getElementById('detailPlatform').textContent = sessionData.platform || 'N/A';
        document.getElementById('detailBrowser').textContent = sessionData.browser || 'N/A';
        document.getElementById('detailStatus').textContent = sessionData.end_time ? 'Ended' : 'Active';

        // Update interactions table
        const interactionsTable = document.querySelector('#sessionInteractionsTable tbody');
        interactionsTable.innerHTML = interactions.map(interaction => `
            <tr>
                <td>${formatDateTime(interaction.interaction_time)}</td>
                <td>${interaction.interaction_type || 'N/A'}</td>
                <td>${interaction.element_id || 'N/A'}</td>
                <td>${interaction.page_url || 'N/A'}</td>
            </tr>
        `).join('') || '<tr><td colspan="4">No interactions found</td></tr>';

        // Update errors table
        const errorsTable = document.querySelector('#sessionErrorsTable tbody');
        errorsTable.innerHTML = errors.map(error => `
            <tr>
                <td>${formatDateTime(error.error_time)}</td>
                <td>${error.error_type || 'N/A'}</td>
                <td>${error.error_message || 'N/A'}</td>
                <td>${error.page_url || 'N/A'}</td>
            </tr>
        `).join('') || '<tr><td colspan="4">No errors found</td></tr>';

        // Show modal
        sessionDetailsModal.classList.add('show');
    } catch (error) {
        console.error('Error fetching session details:', error);
        alert(error.message || 'Failed to load session details. Please try again.');
    }
}

// Setup filters
document.querySelectorAll('select[id$="Filter"]').forEach(filter => {
    filter.addEventListener('change', () => {
        loadDashboardData();
    });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    checkAuth();
}); 