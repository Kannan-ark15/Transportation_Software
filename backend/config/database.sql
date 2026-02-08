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
    gst_no VARCHAR(15) NOT NULL UNIQUE,
    pin_code VARCHAR(6) NOT NULL,
    contact_no VARCHAR(15) NOT NULL UNIQUE,
    email_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    distance_km DECIMAL(10, 2) NOT NULL,
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
    cash_bank VARCHAR(10) NOT NULL,
    bank_id INTEGER,
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_ifsc VARCHAR(30),
    bank_account_no VARCHAR(30),
    commission_pct DECIMAL(5, 2) NOT NULL,
    gross_amount DECIMAL(12, 2) NOT NULL,
    predefined_expenses DECIMAL(12, 2) NOT NULL,
    voucher_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    invoice_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS to_place VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS dealer_name VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2);
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
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS cash_bank VARCHAR(10);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS bank_id INTEGER;
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(30);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(30);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS commission_pct DECIMAL(5, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12, 2);
ALTER TABLE IF EXISTS loading_advances ADD COLUMN IF NOT EXISTS predefined_expenses DECIMAL(12, 2);

-- Loading Advance Invoice Details (Multiple invoices per voucher)
CREATE TABLE IF NOT EXISTS loading_advance_invoices (
    id SERIAL PRIMARY KEY,
    loading_advance_id INTEGER REFERENCES loading_advances(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    to_place VARCHAR(255) NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
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
