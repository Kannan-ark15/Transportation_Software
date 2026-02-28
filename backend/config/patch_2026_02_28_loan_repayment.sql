-- Patch Date: 2026-02-28
-- Purpose: Add Advances and Loans module - Loan Repayment Tracking

BEGIN;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS loan_repayment_trackings (
    id SERIAL PRIMARY KEY,
    loan_master_id INTEGER REFERENCES loan_masters(id) ON DELETE CASCADE,
    loan_master_schedule_id INTEGER REFERENCES loan_master_schedules(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    interest DECIMAL(12, 2) NOT NULL DEFAULT 0,
    due_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    outstanding_principal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    due_settled BOOLEAN NOT NULL DEFAULT FALSE,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (loan_master_schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_loan_repayment_trackings_loan_master_id
    ON loan_repayment_trackings(loan_master_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_trackings_due_settled
    ON loan_repayment_trackings(due_settled);

DROP TRIGGER IF EXISTS update_loan_repayment_trackings_updated_at ON loan_repayment_trackings;
CREATE TRIGGER update_loan_repayment_trackings_updated_at
    BEFORE UPDATE ON loan_repayment_trackings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO loan_repayment_trackings (
    loan_master_id,
    loan_master_schedule_id,
    installment_number,
    due_date,
    principal,
    interest,
    due_amount,
    outstanding_principal,
    due_settled
)
SELECT
    lms.loan_master_id,
    lms.id,
    lms.installment_number,
    lms.due_date,
    lms.principal,
    lms.interest,
    lms.due_amount,
    lms.outstanding_principal,
    FALSE
FROM loan_master_schedules lms
LEFT JOIN loan_repayment_trackings lrt ON lrt.loan_master_schedule_id = lms.id
WHERE lrt.id IS NULL;

COMMIT;
