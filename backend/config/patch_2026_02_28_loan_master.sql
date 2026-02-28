-- Patch Date: 2026-02-28
-- Purpose: Add Advances and Loans module - Loan Master

BEGIN;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS loan_masters (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER REFERENCES banks(id) ON DELETE RESTRICT,
    bank_name VARCHAR(255) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    financier TEXT,
    agreement_number VARCHAR(50) NOT NULL,
    loan_type VARCHAR(150) NOT NULL,
    other_loan_type TEXT,
    loan_amount DECIMAL(12, 2) NOT NULL,
    tenure INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    frequency VARCHAR(40) NOT NULL,
    total_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_master_schedules (
    id SERIAL PRIMARY KEY,
    loan_master_id INTEGER REFERENCES loan_masters(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    interest DECIMAL(12, 2) NOT NULL DEFAULT 0,
    due_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    outstanding_principal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (loan_master_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_loan_masters_bank_id ON loan_masters(bank_id);
CREATE INDEX IF NOT EXISTS idx_loan_masters_vehicle_id ON loan_masters(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_loan_masters_agreement_number ON loan_masters(agreement_number);
CREATE INDEX IF NOT EXISTS idx_loan_masters_created_at ON loan_masters(created_at);
CREATE INDEX IF NOT EXISTS idx_loan_master_schedules_loan_master_id ON loan_master_schedules(loan_master_id);

DROP TRIGGER IF EXISTS update_loan_masters_updated_at ON loan_masters;
CREATE TRIGGER update_loan_masters_updated_at
    BEFORE UPDATE ON loan_masters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

