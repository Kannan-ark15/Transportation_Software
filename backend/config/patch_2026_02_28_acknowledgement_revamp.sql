-- Patch Date: 2026-02-28
-- Purpose: Revamp Acknowledgement Transaction structure for Invoice List & Acknowledgement
-- Adds dealer name, acknowledgement number, acknowledgement date per invoice row.

BEGIN;

ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS dealer_name VARCHAR(255);
ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS acknowledgement_number VARCHAR(100);
ALTER TABLE IF EXISTS acknowledgement_invoices ADD COLUMN IF NOT EXISTS acknowledgement_date DATE;

-- Backfill dealer_name from source loading advance invoices
UPDATE acknowledgement_invoices ai
SET dealer_name = lai.dealer_name
FROM loading_advance_invoices lai
WHERE ai.loading_advance_invoice_id = lai.id
    AND (ai.dealer_name IS NULL OR TRIM(ai.dealer_name) = '');

-- Autogenerate acknowledgement number format: ACK + invoice number (spaces removed)
UPDATE acknowledgement_invoices
SET acknowledgement_number = 'ACK' || regexp_replace(COALESCE(invoice_number, ''), '\s+', '', 'g')
WHERE acknowledgement_number IS NULL
    OR TRIM(acknowledgement_number) = '';

-- Autogenerate acknowledgement date from existing row timestamp
UPDATE acknowledgement_invoices
SET acknowledgement_date = COALESCE(created_at::date, CURRENT_DATE)
WHERE acknowledgement_date IS NULL;

ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN dealer_name SET NOT NULL;
ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN acknowledgement_number SET NOT NULL;
ALTER TABLE IF EXISTS acknowledgement_invoices ALTER COLUMN acknowledgement_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acknowledgement_invoices_ack_no
    ON acknowledgement_invoices(acknowledgement_number);

COMMIT;

