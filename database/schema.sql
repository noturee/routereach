-- OutreachRoute Pro — PostgreSQL Database Schema
-- Run: psql -d outreachroutepro -f schema.sql
-- Or: used automatically by Docker Compose on first startup

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'oa_user',
    organization_name VARCHAR(255),
    assigned_region VARCHAR(255),
    assigned_states TEXT,
    assigned_counties TEXT,
    assigned_cities TEXT,
    assigned_zip_codes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── Territories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS territories (
    id SERIAL PRIMARY KEY,
    territory_name VARCHAR(255) NOT NULL,
    territory_type VARCHAR(50) NOT NULL DEFAULT 'county',
    country VARCHAR(100) DEFAULT 'United States',
    region VARCHAR(100),
    state VARCHAR(100),
    county VARCHAR(100),
    city VARCHAR(100),
    zip_code VARCHAR(10),
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Territories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_territories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    territory_id INTEGER NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, territory_id)
);

-- ── Applicants ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applicants (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    age INTEGER,
    date_of_birth DATE,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    county VARCHAR(100),
    zip_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'United States',
    timezone VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    trade_interest VARCHAR(255),
    education_status VARCHAR(100),
    application_status VARCHAR(100) NOT NULL DEFAULT 'New Application',
    application_status_reason TEXT,
    assigned_oa_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(100),
    referral_source VARCHAR(255),
    date_applied DATE,
    last_contact_date DATE,
    next_follow_up_date DATE,
    is_complete BOOLEAN DEFAULT FALSE,
    is_withdrawn BOOLEAN DEFAULT FALSE,
    withdrawal_reason VARCHAR(255),
    withdrawal_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicants_assigned_oa ON applicants(assigned_oa_id);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(application_status);
CREATE INDEX IF NOT EXISTS idx_applicants_state ON applicants(state);
CREATE INDEX IF NOT EXISTS idx_applicants_zip ON applicants(zip_code);

-- ── Applicant Documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applicant_documents (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    is_received BOOLEAN DEFAULT FALSE,
    date_received DATE,
    notes TEXT,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicant_docs_applicant ON applicant_documents(applicant_id);

-- ── Application Status History ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_status_history (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    old_status VARCHAR(100),
    new_status VARCHAR(100) NOT NULL,
    status_reason TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_applicant ON application_status_history(applicant_id);

-- ── Case Notes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_notes (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note_type VARCHAR(100),
    reason TEXT,
    action TEXT,
    plan TEXT,
    note_body TEXT,
    auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_applicant ON case_notes(applicant_id);

-- ── Outreach Locations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_locations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    county VARCHAR(100),
    zip_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'United States',
    timezone VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    contact_person VARCHAR(255),
    contact_title VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    marketing_allowed BOOLEAN DEFAULT TRUE,
    assigned_oa_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_visit_date DATE,
    next_follow_up_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_state ON outreach_locations(state);
CREATE INDEX IF NOT EXISTS idx_locations_type ON outreach_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_zip ON outreach_locations(zip_code);

-- ── Visit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit_logs (
    id SERIAL PRIMARY KEY,
    outreach_location_id INTEGER NOT NULL REFERENCES outreach_locations(id) ON DELETE CASCADE,
    oa_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    marketing_type VARCHAR(100),
    materials_left VARCHAR(255),
    quantity_left INTEGER,
    contact_person_met VARCHAR(255),
    partner_contact_made BOOLEAN DEFAULT FALSE,
    visit_notes TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    next_follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_location ON visit_logs(outreach_location_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_user ON visit_logs(oa_user_id);

-- ── Routes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    oa_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    route_date DATE NOT NULL,
    starting_address VARCHAR(255),
    country VARCHAR(100) DEFAULT 'United States',
    state VARCHAR(100),
    county VARCHAR(100),
    city VARCHAR(100),
    zip_code VARCHAR(10),
    status VARCHAR(50) DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Route Stops ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    outreach_location_id INTEGER NOT NULL REFERENCES outreach_locations(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL DEFAULT 1,
    estimated_arrival_time TIME,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message_type VARCHAR(20) NOT NULL DEFAULT 'email',
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    delivery_method VARCHAR(20),
    delivery_status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_applicant ON messages(applicant_id);

-- ── Message Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(20) NOT NULL DEFAULT 'both',
    subject VARCHAR(255),
    body TEXT NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Meetings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    oa_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(100),
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    timezone VARCHAR(50),
    meeting_link VARCHAR(500),
    platform VARCHAR(50),
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Performance Metrics ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    new_applications INTEGER DEFAULT 0,
    contacted_applicants INTEGER DEFAULT 0,
    interviews_scheduled INTEGER DEFAULT 0,
    interviews_completed INTEGER DEFAULT 0,
    complete_applications INTEGER DEFAULT 0,
    campus_referrals INTEGER DEFAULT 0,
    accepted_applicants INTEGER DEFAULT 0,
    arrivals INTEGER DEFAULT 0,
    withdrawals INTEGER DEFAULT 0,
    closed_applications INTEGER DEFAULT 0,
    texts_sent INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    calls_logged INTEGER DEFAULT 0,
    meetings_scheduled INTEGER DEFAULT 0,
    meetings_completed INTEGER DEFAULT 0,
    outreach_visits INTEGER DEFAULT 0,
    routes_completed INTEGER DEFAULT 0,
    partner_contacts INTEGER DEFAULT 0,
    materials_distributed INTEGER DEFAULT 0,
    average_days_to_contact FLOAT,
    average_days_to_interview FLOAT,
    average_days_to_complete FLOAT,
    average_days_in_missing_document_status FLOAT,
    application_to_contact_rate FLOAT,
    contact_to_interview_rate FLOAT,
    interview_to_complete_rate FLOAT,
    complete_to_referral_rate FLOAT,
    referral_to_arrival_rate FLOAT,
    application_to_arrival_rate FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, month, year)
);

-- ── Monthly Reports ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    territory VARCHAR(255),
    summary TEXT,
    applicant_activity TEXT,
    outreach_activity TEXT,
    communication_activity TEXT,
    county_breakdown TEXT,
    barriers TEXT,
    performance_analysis TEXT,
    next_month_strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
