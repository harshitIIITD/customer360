-- Customer360 Database Schema for Retail Banking

-- Source Systems table to track data origins
CREATE TABLE IF NOT EXISTS source_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_name TEXT NOT NULL UNIQUE,
    description TEXT,
    connection_details TEXT,
    data_owner TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Data Attributes table to define target schema
CREATE TABLE IF NOT EXISTS customer_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribute_name TEXT NOT NULL UNIQUE,
    data_type TEXT NOT NULL,
    description TEXT,
    is_pii BOOLEAN DEFAULT FALSE,
    category TEXT, -- demographic, financial, behavioral, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source to Target Mapping table
CREATE TABLE IF NOT EXISTS data_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_system_id INTEGER NOT NULL,
    source_attribute TEXT NOT NULL,
    target_attribute_id INTEGER NOT NULL,
    transformation_logic TEXT,
    mapping_status TEXT DEFAULT 'proposed', -- proposed, validated, rejected
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP,
    FOREIGN KEY (source_system_id) REFERENCES source_systems(id),
    FOREIGN KEY (target_attribute_id) REFERENCES customer_attributes(id),
    UNIQUE(source_system_id, source_attribute, target_attribute_id)
);

-- Data Quality Rules
CREATE TABLE IF NOT EXISTS data_quality_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribute_id INTEGER,
    rule_type TEXT NOT NULL, -- completeness, validity, consistency, etc.
    rule_definition TEXT NOT NULL,
    severity TEXT DEFAULT 'medium', -- critical, high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attribute_id) REFERENCES customer_attributes(id)
);

-- Certification Tracking
CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certification_type TEXT NOT NULL, -- data quality, compliance, business value
    certification_status TEXT DEFAULT 'pending', -- pending, certified, rejected
    certified_by TEXT,
    certified_at TIMESTAMP,
    expiry_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer 360 View (the final data product)
CREATE TABLE IF NOT EXISTS customer_360 (
    customer_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    onboarding_date TEXT,
    segment TEXT,
    credit_score INTEGER,
    income_bracket TEXT,
    risk_profile TEXT,
    lifetime_value REAL,
    preferred_channel TEXT,
    last_interaction_date TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_sources TEXT, -- JSON list of source system IDs used
    UNIQUE(email)
);

-- Agent Interactions Log
CREATE TABLE IF NOT EXISTS agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    result TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample source systems
INSERT OR IGNORE INTO source_systems (system_name, description, data_owner) 
VALUES 
('CORE_BANKING', 'Main banking system with account details', 'Banking Operations'),
('CRM_SYSTEM', 'Customer relationship management system', 'Sales Department'),
('LOAN_SYSTEM', 'Loan processing and management system', 'Credit Department'),
('CARD_SYSTEM', 'Credit and debit card management', 'Card Services'),
('DIGITAL_BANKING', 'Online and mobile banking data', 'Digital Banking Team');

-- Insert sample customer attributes
INSERT OR IGNORE INTO customer_attributes (attribute_name, data_type, description, is_pii, category) 
VALUES 
('customer_id', 'TEXT', 'Unique customer identifier', TRUE, 'identity'),
('first_name', 'TEXT', 'Customer first name', TRUE, 'demographic'),
('last_name', 'TEXT', 'Customer last name', TRUE, 'demographic'),
('date_of_birth', 'DATE', 'Customer birth date', TRUE, 'demographic'),
('email', 'TEXT', 'Customer email address', TRUE, 'contact'),
('phone', 'TEXT', 'Customer phone number', TRUE, 'contact'),
('address', 'TEXT', 'Customer physical address', TRUE, 'demographic'),
('city', 'TEXT', 'Customer city', FALSE, 'demographic'),
('state', 'TEXT', 'Customer state', FALSE, 'demographic'),
('zip_code', 'TEXT', 'Customer postal code', FALSE, 'demographic'),
('onboarding_date', 'DATE', 'Date customer joined the bank', FALSE, 'relationship'),
('segment', 'TEXT', 'Customer segment classification', FALSE, 'behavioral'),
('credit_score', 'INTEGER', 'Customer credit score', FALSE, 'financial'),
('income_bracket', 'TEXT', 'Income range category', FALSE, 'financial'),
('risk_profile', 'TEXT', 'Risk assessment category', FALSE, 'financial'),
('lifetime_value', 'REAL', 'Estimated customer lifetime value', FALSE, 'behavioral'),
('preferred_channel', 'TEXT', 'Preferred communication channel', FALSE, 'behavioral'),
('last_interaction_date', 'DATE', 'Date of most recent customer interaction', FALSE, 'behavioral');