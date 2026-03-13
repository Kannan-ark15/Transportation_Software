-- Patch Date: 2026-03-13
-- Purpose: Add Cashbook module - Payments

BEGIN;

CREATE TABLE IF NOT EXISTS cashbook_payments (
    id SERIAL PRIMARY KEY,
    payment_date DATE NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    payment_category VARCHAR(50) NOT NULL CHECK (payment_category IN ('Transactions', 'Advances and Loans', 'Masters')),
    reference_category VARCHAR(20) NOT NULL CHECK (reference_category IN ('Cash', 'Bank')),
    reference_module VARCHAR(80) NOT NULL CHECK (reference_module IN ('Driver Salary Payable', 'Dedicated Owner Payable', 'Due Settlement', 'Insurance')),
    reference_record_id INTEGER NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cashbook_payments_payment_date ON cashbook_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_cashbook_payments_vehicle_id ON cashbook_payments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cashbook_payments_reference_module ON cashbook_payments(reference_module);
CREATE INDEX IF NOT EXISTS idx_cashbook_payments_reference_record_id ON cashbook_payments(reference_record_id);
CREATE INDEX IF NOT EXISTS idx_cashbook_payments_created_by ON cashbook_payments(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cashbook_payments_reference_unique ON cashbook_payments(reference_module, reference_record_id);

COMMIT;
