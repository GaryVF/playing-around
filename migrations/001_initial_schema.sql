-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    user_agent TEXT,
    device_info TEXT,
    platform TEXT,
    browser TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Page Views Table
CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    view_time DATETIME NOT NULL,
    time_spent INTEGER,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
);

-- User Interactions Table
CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    element_id TEXT,
    element_class TEXT,
    element_text TEXT,
    page_url TEXT NOT NULL,
    additional_data TEXT,
    interaction_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
);

-- Form Submissions Table
CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    submission_time DATETIME NOT NULL,
    form_data TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    page_url TEXT NOT NULL,
    additional_data TEXT,
    error_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    load_time INTEGER NOT NULL,
    dom_interactive INTEGER,
    dom_complete INTEGER,
    first_paint INTEGER,
    first_contentful_paint INTEGER,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
); 