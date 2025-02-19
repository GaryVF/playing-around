const express = require('express');
const dataHandler = require('./data-handler');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());

// Serve static files from the root directory
app.use('/', express.static(path.join(__dirname)));

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API Routes
app.get('/api/submissions', (req, res) => {
    try {
        const submissions = dataHandler.getAllSubmissions();
        console.log('GET /api/submissions - Found:', submissions);
        res.json(submissions);
    } catch (error) {
        console.error('GET /api/submissions - Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
});

app.post('/api/submit-form', (req, res) => {
    try {
        console.log('POST /api/submit-form - Received:', req.body);
        const submissionId = dataHandler.saveSubmission({
            ...req.body,
            ipAddress: req.ip
        });
        console.log('POST /api/submit-form - Saved with ID:', submissionId);
        res.json({ success: true, submissionId });
    } catch (error) {
        console.error('POST /api/submit-form - Error:', error);
        res.status(500).json({ success: false, error: 'Failed to save submission' });
    }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Data directory:', dataHandler.baseDir);
    console.log('Available routes:');
    console.log('- GET  /api/submissions');
    console.log('- POST /api/submit-form');
}); 