const API_URL = '/api/submissions';

document.addEventListener('DOMContentLoaded', function() {
    initializeInterestDashboard();
    
    // Add event listeners
    document.getElementById('refreshData').addEventListener('click', refreshData);
    document.getElementById('searchInput').addEventListener('input', filterSubmissions);
    document.getElementById('statusFilter').addEventListener('change', filterSubmissions);
});

async function initializeInterestDashboard() {
    try {
        const submissions = await fetchSubmissions();
        updateMetrics(submissions);
        displaySubmissions(submissions);
    } catch (error) {
        showNotification('Failed to load submissions', 'error');
    }
}

async function fetchSubmissions() {
    try {
        console.log('Fetching submissions from:', API_URL);
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not OK:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                body: errorText
            });
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Submissions fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('Error fetching submissions:', {
            error: error.message,
            stack: error.stack
        });
        showNotification(`Failed to fetch submissions: ${error.message}`, 'error');
        return {};
    }
}

function updateMetrics(submissions) {
    const totalSubmissions = Object.keys(submissions).length;
    const recentSubmissions = Object.values(submissions)
        .filter(s => new Date(s.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length;
    
    document.getElementById('totalSubmissions').textContent = totalSubmissions;
    document.getElementById('submissionTrend').textContent = 
        `+${((recentSubmissions / totalSubmissions) * 100).toFixed(1)}%`;
}

function displaySubmissions(submissions) {
    const grid = document.getElementById('submissionsGrid');
    grid.innerHTML = '';

    if (!submissions || Object.keys(submissions).length === 0) {
        grid.innerHTML = `
            <div class="no-submissions">
                <p>No submissions found</p>
            </div>
        `;
        return;
    }

    Object.entries(submissions)
        .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
        .forEach(([id, submission]) => {
            const card = createSubmissionCard(id, submission);
            grid.appendChild(card);
        });
}

function createSubmissionCard(id, submission) {
    const card = document.createElement('div');
    card.className = 'submission-card';
    card.innerHTML = `
        <div class="submission-header">
            <span class="submission-id">#${id}</span>
            <span class="submission-status status-${submission.status}">${submission.status}</span>
        </div>
        <div class="submission-content">
            <h4>${submission.name}</h4>
            <p>${submission.subject}</p>
        </div>
        <div class="submission-meta">
            <span>${new Date(submission.timestamp).toLocaleDateString()}</span>
        </div>
    `;

    card.addEventListener('click', () => showSubmissionDetails(id, submission));
    return card;
}

function showSubmissionDetails(id, submission) {
    const details = document.getElementById('submissionDetails');
    details.classList.add('open');
    
    details.querySelector('.details-content').innerHTML = `
        <div class="detail-group">
            <h4>Contact Information</h4>
            <p>Name: ${submission.name}</p>
            <p>Email: ${submission.email}</p>
        </div>
        <div class="detail-group">
            <h4>Subject</h4>
            <p>${submission.subject}</p>
        </div>
        <div class="detail-group">
            <h4>Message</h4>
            <p>${submission.data.message}</p>
        </div>
        <div class="detail-group">
            <h4>Metadata</h4>
            <p>Submission ID: ${id}</p>
            <p>Status: ${submission.status}</p>
            <p>Submitted: ${new Date(submission.timestamp).toLocaleString()}</p>
        </div>
    `;
}

function filterSubmissions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const cards = document.querySelectorAll('.submission-card');

    cards.forEach(card => {
        const content = card.textContent.toLowerCase();
        const status = card.querySelector('.submission-status').textContent;
        const matchesSearch = content.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
    });
}

async function refreshData() {
    const button = document.getElementById('refreshData');
    button.disabled = true;
    button.innerHTML = '<span class="refresh-icon spinning">↻</span> Refreshing...';

    try {
        const submissions = await fetchSubmissions();
        updateMetrics(submissions);
        displaySubmissions(submissions);
        showNotification('Data refreshed successfully', 'success');
    } catch (error) {
        showNotification('Failed to refresh data', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<span class="refresh-icon">↻</span> Refresh Data';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : '⚠'}</span>
        <span class="notification-message">${message}</span>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
} 