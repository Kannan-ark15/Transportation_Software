-- Create database (run this separately if needed)
-- CREATE DATABASE transport_db;

-- Connect to transport_db before running the following commands

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    company_address_1 TEXT NOT NULL,
    company_address_2 TEXT,
    place VARCHAR(255) NOT NULL,
    gst_no VARCHAR(15) NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    contact_no VARCHAR(15) NOT NULL UNIQUE,
    email_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GST number can repeat across masters
ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_gst_no_key;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_gst_no ON companies(gst_no);
CREATE INDEX IF NOT EXISTS idx_companies_contact_no ON companies(contact_no);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function before update
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE companies IS 'Master table for company information';
COMMENT ON COLUMN companies.gst_no IS 'GST number must be valid format (15 characters)';
COMMENT ON COLUMN companies.pin_code IS 'PIN code must be 6 digits';
COMMENT ON COLUMN companies.contact_no IS 'Contact number with country code';

-- Create loading_advances table (Transactions)
CREATE TABLE IF NOT EXISTS loading_advances (
    id SERIAL PRIMARY KEY,
    voucher_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_registration_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_sub_type VARCHAR(50) NOT NULL,
    vehicle_body_type VARCHAR(50) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_type VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    to_place VARCHAR(255) NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    kt_freight DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    ifa_amount DECIMAL(12, 2) NOT NULL,
    sum_ifas DECIMAL(12, 2) NOT NULL,
    driver_bata DECIMAL(10, 2) NOT NULL,
    unloading DECIMAL(10, 2) NOT NULL,
    tarpaulin DECIMAL(10, 2) NOT NULL,
    city_tax DECIMAL(10, 2) NOT NULL,
    maintenance DECIMAL(10, 2) NOT NULL,
    pump_name VARCHAR(255) NOT NULL,
    fuel_litre DECIMAL(10, 2) NOT NULL,
    fuel_rate DECIMAL(10, 2) NOT NULL,
    fuel_amount DECIMAL(12, 2) NOT NULL,
    driver_name VARCHAR(255),
    driver_loading_advance DECIMAL(12, 2) NOT NULL,
    trip_balance DECIMAL(12, 2) NOT NULL,
    commission_pct DECIMAL(5, 2) NOT NULL,
    predefined_expenses DECIMAL(12, 2) NOT NULL,
    voucher_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    invoice_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS to_place VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS dealer_name VARCHAR(255);

ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS kt_freight DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 3);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS ifa_amount DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS sum_ifas DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS driver_bata DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS unloading DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS tarpaulin DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS city_tax DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS maintenance DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS pump_name VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS fuel_litre DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS fuel_rate DECIMAL(10, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS fuel_amount DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS driver_loading_advance DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS trip_balance DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS commission_pct DECIMAL(5, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS predefined_expenses DECIMAL(12, 2);

-- Loading Advance Invoice Details (Multiple invoices per voucher)
CREATE TABLE IF NOT EXISTS loading_advance_invoices (
    id SERIAL PRIMARY KEY,
    loading_advance_id INTEGER REFERENCES loading_advances(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    to_place VARCHAR(255) NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    kt_freight DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    ifa_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loading_advance_invoice_unique ON loading_advance_invoices(loading_advance_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_loading_advance_invoice_place ON loading_advance_invoices(to_place);

CREATE INDEX IF NOT EXISTS idx_loading_advances_voucher_number ON loading_advances(voucher_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loading_advances_voucher_invoice ON loading_advances(voucher_number, invoice_number);
CREATE INDEX IF NOT EXISTS idx_loading_advances_invoice_number ON loading_advances(invoice_number);
CREATE INDEX IF NOT EXISTS idx_loading_advances_to_place ON loading_advances(to_place);
CREATE INDEX IF NOT EXISTS idx_loading_advances_vehicle ON loading_advances(vehicle_registration_number);
CREATE INDEX IF NOT EXISTS idx_loading_advances_invoice_date ON loading_advances(invoice_date);

CREATE TRIGGER update_loading_advances_updated_at
    BEFORE UPDATE ON loading_advances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Acknowledgements (Transactions)
CREATE TABLE IF NOT EXISTS acknowledgements (
    id SERIAL PRIMARY KEY,
    loading_advance_id INTEGER UNIQUE REFERENCES loading_advances(id) ON DELETE CASCADE,
    voucher_number VARCHAR(20) NOT NULL,
    voucher_status VARCHAR(20) NOT NULL CHECK (voucher_status IN ('Pending', 'Ready for Settlement')),
    voucher_pending_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acknowledgement_invoices (
    id SERIAL PRIMARY KEY,
    acknowledgement_id INTEGER REFERENCES acknowledgements(id) ON DELETE CASCADE,
    loading_advance_invoice_id INTEGER REFERENCES loading_advance_invoices(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    to_place VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    ifa_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Acknowledged', 'Shortage', 'Pending')),
    returned_amount DECIMAL(12, 2) NOT NULL,
    acknowledgement_number VARCHAR(100) NOT NULL,
    acknowledgement_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acknowledgements_loading_advance ON acknowledgements(loading_advance_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgements_voucher_number ON acknowledgements(voucher_number);
CREATE INDEX IF NOT EXISTS idx_acknowledgement_invoices_ack_id ON acknowledgement_invoices(acknowledgement_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgement_invoices_status ON acknowledgement_invoices(status);
CREATE INDEX IF NOT EXISTS idx_acknowledgement_invoices_ack_no ON acknowledgement_invoices(acknowledgement_number);

ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS dealer_name VARCHAR(255);
ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS acknowledgement_number VARCHAR(100);
ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS acknowledgement_date DATE;

UPDATE acknowledgement_invoices ai
SET dealer_name = lai.dealer_name
FROM loading_advance_invoices lai
WHERE ai.loading_advance_invoice_id = lai.id
    AND (ai.dealer_name IS NULL OR TRIM(ai.dealer_name) = '');

UPDATE acknowledgement_invoices
SET acknowledgement_number = 'ACK' || regexp_replace(COALESCE(invoice_number, ''), '\s+', '', 'g')
WHERE acknowledgement_number IS NULL
    OR TRIM(acknowledgement_number) = '';

UPDATE acknowledgement_invoices
SET acknowledgement_date = COALESCE(created_at::date, CURRENT_DATE)
WHERE acknowledgement_date IS NULL;

ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN dealer_name SET NOT NULL;
ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN acknowledgement_number SET NOT NULL;
ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN acknowledgement_date SET NOT NULL;

UPDATE acknowledgements
SET voucher_status = 'Ready for Settlement'
WHERE voucher_status = 'Settled';

ALTER TABLE IF EXISTS acknowledgements DROP CONSTRAINT IF EXISTS acknowledgements_voucher_status_check;
ALTER TABLE IF EXISTS acknowledgements
    ADD CONSTRAINT acknowledgements_voucher_status_check
    CHECK (voucher_status IN ('Pending', 'Ready for Settlement'));

CREATE TRIGGER update_acknowledgements_updated_at
    BEFORE UPDATE ON acknowledgements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Dedicated & Market Vehicle Balance Settlement (Transactions)
CREATE TABLE IF NOT EXISTS dedicated_market_settlements (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
    owner_name VARCHAR(255) NOT NULL,
    owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('Dedicated', 'Market')),
    cash_bank VARCHAR(10) NOT NULL CHECK (cash_bank IN ('Cash', 'Bank')),
    bank_name VARCHAR(255),
    branch VARCHAR(255),
    account_no VARCHAR(30),
    ifsc_code VARCHAR(20),
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_percent DECIMAL(6, 4) NOT NULL DEFAULT 6,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settlement_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settled BOOLEAN NOT NULL DEFAULT TRUE,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dedicated_market_settlement_vouchers (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER REFERENCES dedicated_market_settlements(id) ON DELETE CASCADE,
    acknowledgement_id INTEGER REFERENCES acknowledgements(id) ON DELETE RESTRICT,
    loading_advance_id INTEGER UNIQUE REFERENCES loading_advances(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    voucher_number VARCHAR(20) NOT NULL,
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    final_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dm_settlements_owner_id ON dedicated_market_settlements(owner_id);
CREATE INDEX IF NOT EXISTS idx_dm_settlements_owner_name ON dedicated_market_settlements(owner_name);
CREATE INDEX IF NOT EXISTS idx_dm_settlements_created_at ON dedicated_market_settlements(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_vouchers_settlement_id ON dedicated_market_settlement_vouchers(settlement_id);
CREATE INDEX IF NOT EXISTS idx_dm_vouchers_voucher_number ON dedicated_market_settlement_vouchers(voucher_number);

CREATE TRIGGER update_dedicated_market_settlements_updated_at
    BEFORE UPDATE ON dedicated_market_settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Own Vehicle Balance Settlement (Transactions)
CREATE TABLE IF NOT EXISTS own_vehicle_settlements (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE RESTRICT,
    driver_name VARCHAR(255) NOT NULL,
    cash_bank VARCHAR(10) NOT NULL CHECK (cash_bank IN ('Cash', 'Bank')),
    bank_name VARCHAR(255),
    branch VARCHAR(255),
    account_number VARCHAR(30),
    ifsc_code VARCHAR(20),
    total_driver_bata DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_driver_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_salary_payable DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settled BOOLEAN NOT NULL DEFAULT TRUE,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS own_vehicle_settlement_vouchers (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER REFERENCES own_vehicle_settlements(id) ON DELETE CASCADE,
    acknowledgement_id INTEGER REFERENCES acknowledgements(id) ON DELETE RESTRICT,
    loading_advance_id INTEGER UNIQUE REFERENCES loading_advances(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    voucher_number VARCHAR(20) NOT NULL,
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_bata DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unloading DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tarpaulin DECIMAL(12, 2) NOT NULL DEFAULT 0,
    city_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    maintenance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    parking_charges DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_1 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_2 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_3 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fuel_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_loading_advance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ov_settlements_driver_id ON own_vehicle_settlements(driver_id);
CREATE INDEX IF NOT EXISTS idx_ov_settlements_driver_name ON own_vehicle_settlements(driver_name);
CREATE INDEX IF NOT EXISTS idx_ov_settlements_created_at ON own_vehicle_settlements(created_at);
CREATE INDEX IF NOT EXISTS idx_ov_vouchers_settlement_id ON own_vehicle_settlement_vouchers(settlement_id);
CREATE INDEX IF NOT EXISTS idx_ov_vouchers_voucher_number ON own_vehicle_settlement_vouchers(voucher_number);

CREATE TRIGGER update_own_vehicle_settlements_updated_at
    BEFORE UPDATE ON own_vehicle_settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add TDS column to loading_advances table if it doesn't exist
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS tds DECIMAL(10, 2) DEFAULT 0 NOT NULL;
