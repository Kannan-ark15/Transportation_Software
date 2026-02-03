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
