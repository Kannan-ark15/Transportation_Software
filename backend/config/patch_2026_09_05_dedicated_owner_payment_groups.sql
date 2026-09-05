-- Patch Date: 2026-09-05
-- Purpose: Support payments for the remaining dedicated/market vouchers grouped by owner and vehicle.

BEGIN;

ALTER TABLE IF EXISTS cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_record_type VARCHAR(40);

ALTER TABLE IF EXISTS cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_loading_advance_ids INTEGER[];

ALTER TABLE IF EXISTS cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_amount_snapshot DECIMAL(12, 2);

UPDATE cashbook_payments
SET reference_record_type = 'Settlement'
WHERE reference_record_type IS NULL
   OR TRIM(reference_record_type) = '';

ALTER TABLE IF EXISTS cashbook_payments
    ALTER COLUMN reference_record_type SET DEFAULT 'Settlement';

ALTER TABLE IF EXISTS cashbook_payments
    ALTER COLUMN reference_record_type SET NOT NULL;

DROP INDEX IF EXISTS idx_cashbook_payments_reference_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashbook_payments_reference_unique
    ON cashbook_payments(reference_module, reference_record_type, reference_record_id);

CREATE INDEX IF NOT EXISTS idx_cashbook_payments_reference_loading_advance_ids
    ON cashbook_payments USING GIN(reference_loading_advance_ids);

COMMIT;
