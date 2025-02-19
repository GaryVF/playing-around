document.addEventListener('DOMContentLoaded', function() {
    // Initialize all charts and visualizations
    initDeliveryTrendsChart();
    initRouteEfficiencyChart();
    initVehicleStatusChart();
    initHeatmap();
    populatePerformanceMetrics();

    // Add refresh functionality
    document.getElementById('refreshData').addEventListener('click', refreshAllData);
    document.getElementById('timeRange').addEventListener('change', handleTimeRangeChange);

    initDateRangeSelector();
});

function initDeliveryTrendsChart() {
    const ctx = document.getElementById('deliveryTrendsChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.5)');
    gradient.addColorStop(1, 'rgba(46, 125, 50, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(24),
            datasets: [{
                label: 'Deliveries',
                data: generateRandomData(24, 100, 500),
                borderColor: '#2E7D32',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

function initRouteEfficiencyChart() {
    const ctx = document.getElementById('routeEfficiencyChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Efficiency Score',
                data: generateRandomData(7, 80, 95),
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

function initVehicleStatusChart() {
    const ctx = document.getElementById('vehicleStatusChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Idle', 'Maintenance', 'Offline'],
            datasets: [{
                data: [65, 15, 12, 8],
                backgroundColor: [
                    '#4CAF50',
                    '#FFC107',
                    '#2196F3',
                    '#F44336'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

function initHeatmap() {
    const container = document.getElementById('heatmapContainer');
    const width = container.offsetWidth;
    const height = 300;

    const svg = d3.select('#heatmapContainer')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Generate random heatmap data
    const data = generateHeatmapData();

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateGreens)
        .domain([0, d3.max(data, d => d.value)]);

    // Draw rectangles
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => d.x * (width / 24))
        .attr('y', d => d.y * (height / 7))
        .attr('width', width / 24)
        .attr('height', height / 7)
        .attr('fill', d => colorScale(d.value))
        .attr('opacity', 0.8);
}

function populatePerformanceMetrics() {
    const metrics = [
        { name: 'On-Time Delivery Rate', value: '94.8%', change: '+2.3%', status: 'positive' },
        { name: 'Average Speed', value: '34.2 mph', change: '+1.5%', status: 'positive' },
        { name: 'Fuel Consumption', value: '3.2 gal/h', change: '-5.1%', status: 'positive' },
        { name: 'Vehicle Utilization', value: '87.3%', change: '+3.7%', status: 'positive' },
        { name: 'Route Deviation', value: '4.2%', change: '+0.8%', status: 'negative' }
    ];

    const tbody = document.getElementById('performanceMetricsBody');
    tbody.innerHTML = metrics.map(metric => `
        <tr>
            <td>${metric.name}</td>
            <td>${metric.value}</td>
            <td class="${metric.status}">${metric.change}</td>
            <td>
                <span class="status-indicator ${metric.status}">
                    ${metric.status === 'positive' ? '↑' : '↓'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Helper Functions
function generateTimeLabels(count) {
    const labels = [];
    for (let i = 0; i < count; i++) {
        labels.push(`${i}:00`);
    }
    return labels;
}

function generateRandomData(count, min, max) {
    return Array.from({ length: count }, () => 
        Math.floor(Math.random() * (max - min + 1) + min)
    );
}

function generateHeatmapData() {
    const data = [];
    for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 24; x++) {
            data.push({
                x: x,
                y: y,
                value: Math.random() * 100
            });
        }
    }
    return data;
}

function refreshAllData() {
    const button = document.getElementById('refreshData');
    button.disabled = true;
    button.innerHTML = '<span class="refresh-icon spinning">↻</span> Refreshing...';

    // Simulate data refresh
    setTimeout(() => {
        initDeliveryTrendsChart();
        initRouteEfficiencyChart();
        initVehicleStatusChart();
        initHeatmap();
        populatePerformanceMetrics();

        button.disabled = false;
        button.innerHTML = '<span class="refresh-icon">↻</span> Refresh Data';
    }, 1000);
}

function handleTimeRangeChange(e) {
    refreshAllData();
}

function initDateRangeSelector() {
    const timeRange = document.getElementById('timeRange');
    const dateRangeContainer = document.querySelector('.date-range-container');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const applyButton = document.getElementById('applyDateRange');

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    startDate.value = formatDate(thirtyDaysAgo);
    endDate.value = formatDate(today);

    // Show/hide custom date range based on selection
    timeRange.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            dateRangeContainer.style.display = 'flex';
            // Add slide down animation
            dateRangeContainer.style.animation = 'slideDown 0.3s ease forwards';
        } else {
            dateRangeContainer.style.display = 'none';
            handleTimeRangeChange(e);
        }
    });

    // Handle date range application
    applyButton.addEventListener('click', () => {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);

        if (start > end) {
            showNotification('Start date must be before end date', 'error');
            return;
        }

        refreshAllData(start, end);
    });

    // Validate date inputs
    endDate.addEventListener('change', () => {
        if (new Date(startDate.value) > new Date(endDate.value)) {
            showNotification('Start date must be before end date', 'error');
            endDate.value = startDate.value;
        }
    });
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function refreshAllData(startDate, endDate) {
    const button = document.getElementById('refreshData');
    button.disabled = true;
    button.innerHTML = '<span class="refresh-icon spinning">↻</span> Refreshing...';

    // Get the selected time range
    const timeRange = document.getElementById('timeRange').value;
    
    // Calculate date range based on selection or custom dates
    let dateRange;
    if (timeRange === 'custom' && startDate && endDate) {
        dateRange = { start: startDate, end: endDate };
    } else {
        dateRange = calculateDateRange(timeRange);
    }

    // Simulate data refresh with date range
    setTimeout(() => {
        initDeliveryTrendsChart(dateRange);
        initRouteEfficiencyChart(dateRange);
        initVehicleStatusChart(dateRange);
        initHeatmap(dateRange);
        populatePerformanceMetrics(dateRange);

        button.disabled = false;
        button.innerHTML = '<span class="refresh-icon">↻</span> Refresh Data';
        
        // Show success notification
        showNotification('Data updated successfully', 'success');
    }, 1000);
}

function calculateDateRange(timeRange) {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
        case '24h':
            start.setHours(start.getHours() - 24);
            break;
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '90d':
            start.setDate(start.getDate() - 90);
            break;
    }

    return { start, end };
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : '⚠'}</span>
        <span class="notification-message">${message}</span>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
} 