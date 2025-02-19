const fs = require('fs');
const path = require('path');

class DataHandler {
    constructor() {
        this.baseDir = path.join(__dirname, 'data');
        this.submissionsDir = path.join(this.baseDir, 'submissions');
        this.initializeDirectories();
    }

    initializeDirectories() {
        // Create base directories if they don't exist
        [this.baseDir, this.submissionsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Initialize or load metadata
        this.metadata = this.loadMetadata();
    }

    loadMetadata() {
        const metadataPath = path.join(this.baseDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
        const initialMetadata = {
            totalSubmissions: 0,
            lastSubmissionId: 0,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(metadataPath, JSON.stringify(initialMetadata, null, 2));
        return initialMetadata;
    }

    generateSubmissionId() {
        this.metadata.lastSubmissionId++;
        this.metadata.totalSubmissions++;
        this.metadata.lastUpdated = new Date().toISOString();
        fs.writeFileSync(
            path.join(this.baseDir, 'metadata.json'),
            JSON.stringify(this.metadata, null, 2)
        );
        return this.metadata.lastSubmissionId.toString().padStart(6, '0');
    }

    saveSubmission(formData) {
        try {
            const submissionId = this.generateSubmissionId();
            const timestamp = new Date();
            const yearMonth = timestamp.toISOString().slice(0, 7); // YYYY-MM
            
            // Create year-month directory if it doesn't exist
            const monthDir = path.join(this.submissionsDir, yearMonth);
            if (!fs.existsSync(monthDir)) {
                fs.mkdirSync(monthDir, { recursive: true });
            }

            const submission = {
                id: submissionId,
                timestamp: timestamp.toISOString(),
                data: formData,
                metadata: {
                    userAgent: formData.userAgent,
                    ipAddress: formData.ipAddress,
                    status: 'new',
                    lastUpdated: timestamp.toISOString()
                }
            };

            // Save individual submission
            const submissionPath = path.join(monthDir, `submission_${submissionId}.json`);
            fs.writeFileSync(submissionPath, JSON.stringify(submission, null, 2));
            console.log(`Saved submission to: ${submissionPath}`); // Debug log

            // Update submissions index
            this.updateSubmissionsIndex(submission);
            console.log('Updated submissions index'); // Debug log

            return submissionId;
        } catch (error) {
            console.error('Error saving submission:', error);
            throw error;
        }
    }

    updateSubmissionsIndex(submission) {
        const indexPath = path.join(this.baseDir, 'submissions.json');
        let index = {};
        
        if (fs.existsSync(indexPath)) {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }

        index[submission.id] = {
            timestamp: submission.timestamp,
            name: submission.data.name,
            email: submission.data.email,
            subject: submission.data.subject,
            status: submission.metadata.status
        };

        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }

    getSubmission(id) {
        const timestamp = new Date();
        const yearMonth = timestamp.toISOString().slice(0, 7);
        const submissionPath = path.join(
            this.submissionsDir,
            yearMonth,
            `submission_${id}.json`
        );

        if (fs.existsSync(submissionPath)) {
            return JSON.parse(fs.readFileSync(submissionPath, 'utf8'));
        }
        return null;
    }

    getAllSubmissions() {
        try {
            const indexPath = path.join(this.baseDir, 'submissions.json');
            if (fs.existsSync(indexPath)) {
                const submissions = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
                console.log(`Found ${Object.keys(submissions).length} submissions`); // Debug log
                return submissions;
            }
            console.log('No submissions found'); // Debug log
            return {};
        } catch (error) {
            console.error('Error getting submissions:', error);
            throw error;
        }
    }
}

module.exports = new DataHandler(); 