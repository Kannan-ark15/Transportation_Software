-- MASTER TABLES SCHEMA

-- 1. PRODUCT MASTER
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) UNIQUE NOT NULL,
    measuring_unit VARCHAR(50) NOT NULL CHECK (measuring_unit IN ('Tons', 'Nos')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DRIVER MASTER
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(6) UNIQUE NOT NULL, -- 6 digit system generated
    driver_name VARCHAR(255) NOT NULL,
    primary_contact_no VARCHAR(15) UNIQUE NOT NULL,
    secondary_contact_no VARCHAR(15) UNIQUE,
    blood_group VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    license_no VARCHAR(50) UNIQUE NOT NULL,
    license_exp_date DATE NOT NULL,
    aadhar_no VARCHAR(20) UNIQUE NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    driver_status BOOLEAN DEFAULT TRUE NOT NULL, -- Toggle Active/Inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PUMP MASTER
CREATE TABLE IF NOT EXISTS pumps (
    id SERIAL PRIMARY KEY,
    pump_name VARCHAR(255) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_no VARCHAR(15),
    email_id VARCHAR(255) NOT NULL,
    company_address_1 TEXT NOT NULL,
    company_address_2 TEXT,
    place VARCHAR(255) NOT NULL,
    pan_no VARCHAR(20) NOT NULL,
    gst_no VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PLACE MASTER
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    from_place VARCHAR(255) NOT NULL,
    to_place VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(to_place, product_id) -- Unique Place + Product Combination as per rules
);

-- 4A. PLACE RATE CHART MAPPING (Place <-> Rate Cards)
CREATE TABLE IF NOT EXISTS place_rate_cards (
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    rate_card_id INTEGER REFERENCES rate_cards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(place_id, rate_card_id)
);

-- 4B. LOGIN USERS
CREATE TABLE IF NOT EXISTS login_users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    login_prefix VARCHAR(3) NOT NULL DEFAULT 'HOF',
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS login_users
    ADD COLUMN IF NOT EXISTS login_prefix VARCHAR(3) NOT NULL DEFAULT 'HOF';

-- Vehicle Master cleanup: remove RC fields
ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS rc_expiry_date;
ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS rc_document;

-- 5. DEALER MASTER
CREATE TABLE IF NOT EXISTS dealers (
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    district VARCHAR(100) NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    gst_no VARCHAR(20) UNIQUE NOT NULL,
    contact_no_1 VARCHAR(15) NOT NULL,
    contact_no_2 VARCHAR(15),
    sales_area VARCHAR(255) NOT NULL,
    sales_officer_no VARCHAR(15) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at (Generic function already exists but let's ensure it's there)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('products', 'drivers', 'pumps', 'places', 'dealers', 'login_users')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;
