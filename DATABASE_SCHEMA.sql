-- ====================================================================
-- MEENTO: Smart Queue Management System
-- Production Relational Schema Definition (PostgreSQL 14+)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. ENUMS
-- --------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE token_status AS ENUM ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('OPEN', 'PAUSED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE counter_status AS ENUM ('OPEN', 'BUSY', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('JOINED', 'CALLED', 'SERVING_STARTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- --------------------------------------------------------------------
-- 2. CORE TABLES
-- --------------------------------------------------------------------

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Venues Table
CREATE TABLE IF NOT EXISTS venues (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id VARCHAR(36) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venues_business_id ON venues(business_id);

-- Staff Memberships Table
CREATE TABLE IF NOT EXISTS staff_memberships (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id VARCHAR(36) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    role_title VARCHAR(100) NOT NULL DEFAULT 'Service Executive',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_venue UNIQUE (user_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_memberships_venue ON staff_memberships(venue_id);

-- Service Counters Table
CREATE TABLE IF NOT EXISTS service_counters (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    venue_id VARCHAR(36) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    counter_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status counter_status NOT NULL DEFAULT 'OPEN',
    current_staff_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_venue_counter_num UNIQUE (venue_id, counter_number)
);

CREATE INDEX IF NOT EXISTS idx_counters_venue ON service_counters(venue_id);

-- Queues Table
CREATE TABLE IF NOT EXISTS queues (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    venue_id VARCHAR(36) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    prefix VARCHAR(10) NOT NULL DEFAULT 'Q',
    max_capacity INT NOT NULL DEFAULT 100,
    status queue_status NOT NULL DEFAULT 'OPEN',
    estimated_service_time_minutes INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queues_venue ON queues(venue_id);

-- Queue Entries (Digital Tokens) Table
CREATE TABLE IF NOT EXISTS queue_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    queue_id VARCHAR(36) NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    token_number INT NOT NULL,
    formatted_code VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    status token_status NOT NULL DEFAULT 'WAITING',
    counter_id VARCHAR(36) REFERENCES service_counters(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_queue_token UNIQUE (queue_id, token_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(queue_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_phone ON queue_entries(customer_phone);

-- Queue Events (Audit Log) Table
CREATE TABLE IF NOT EXISTS queue_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    queue_entry_id VARCHAR(36) NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    counter_id VARCHAR(36),
    staff_id VARCHAR(36),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_events_entry ON queue_events(queue_entry_id);

-- Service Records (Performance Analytics) Table
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    queue_entry_id VARCHAR(36) UNIQUE NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
    counter_id VARCHAR(36) NOT NULL REFERENCES service_counters(id) ON DELETE CASCADE,
    staff_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_records_counter ON service_records(counter_id);
CREATE INDEX IF NOT EXISTS idx_service_records_staff ON service_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_service_records_completed ON service_records(completed_at);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    queue_entry_id VARCHAR(36) NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_entry ON notifications(queue_entry_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
