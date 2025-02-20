const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create a new database connection
const db = new sqlite3.Database('tracking.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Read and execute the migration file
const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

// Execute migration
db.exec(migration, (err) => {
    if (err) {
        console.error('Error executing migration:', err);
        process.exit(1);
    }
    console.log('Database schema created successfully');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
            process.exit(1);
        }
        console.log('Database connection closed');
    });
}); 