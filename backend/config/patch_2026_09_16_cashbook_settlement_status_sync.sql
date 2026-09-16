-- Patch Date: 2026-09-16
-- Purpose: Synchronize Balance Settlement status with Cashbook payments.

BEGIN;

ALTER TABLE cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_record_type VARCHAR(40);

ALTER TABLE cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_loading_advance_ids INTEGER[];

ALTER TABLE cashbook_payments
    ADD COLUMN IF NOT EXISTS reference_amount_snapshot DECIMAL(12,2);

UPDATE cashbook_payments
SET reference_record_type = 'Settlement'
WHERE reference_record_type IS NULL
   OR TRIM(reference_record_type) = '';

ALTER TABLE cashbook_payments
    ALTER COLUMN reference_record_type SET DEFAULT 'Settlement';

ALTER TABLE cashbook_payments
    ALTER COLUMN reference_record_type SET NOT NULL;

DROP INDEX IF EXISTS idx_cashbook_payments_reference_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashbook_payments_reference_unique
ON cashbook_payments (
    reference_module,
    reference_record_type,
    reference_record_id
);

CREATE INDEX IF NOT EXISTS idx_cashbook_payments_reference_loading_advance_ids
ON cashbook_payments
USING GIN (reference_loading_advance_ids);

ALTER TABLE own_vehicle_settlements
    ALTER COLUMN settled SET DEFAULT FALSE;

ALTER TABLE own_vehicle_settlements
    ALTER COLUMN settled_at DROP DEFAULT;

WITH payment_status AS (
    SELECT
        cp.reference_module,
        cp.reference_record_id AS settlement_id,
        MAX(cp.amount_paid) AS amount_paid,
        MAX(cp.payment_date::TIMESTAMP WITH TIME ZONE) AS paid_at
    FROM cashbook_payments cp
    WHERE cp.reference_module IN ('Driver Salary Payable', 'Dedicated Owner Payable')
      AND COALESCE(cp.reference_record_type, 'Settlement') = 'Settlement'
    GROUP BY cp.reference_module, cp.reference_record_id
)
UPDATE own_vehicle_settlements s
SET settled = ps.amount_paid >= COALESCE(s.driver_salary_payable, 0),
    settled_at = CASE
        WHEN ps.amount_paid >= COALESCE(s.driver_salary_payable, 0) THEN ps.paid_at
        ELSE NULL
    END,
    updated_at = CURRENT_TIMESTAMP
FROM payment_status ps
WHERE ps.reference_module = 'Driver Salary Payable'
  AND ps.settlement_id = s.id;

UPDATE own_vehicle_settlements s
SET settled = FALSE,
    settled_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM cashbook_payments cp
    WHERE cp.reference_module = 'Driver Salary Payable'
      AND COALESCE(cp.reference_record_type, 'Settlement') = 'Settlement'
      AND cp.reference_record_id = s.id
);

WITH payment_status AS (
    SELECT
        cp.reference_record_id AS settlement_id,
        MAX(cp.amount_paid) AS amount_paid,
        MAX(cp.payment_date::TIMESTAMP WITH TIME ZONE) AS paid_at
    FROM cashbook_payments cp
    WHERE cp.reference_module = 'Dedicated Owner Payable'
      AND COALESCE(cp.reference_record_type, 'Settlement') = 'Settlement'
    GROUP BY cp.reference_record_id
)
UPDATE dedicated_market_settlements s
SET settled = ps.amount_paid >= COALESCE(s.settlement_balance, 0),
    settled_at = CASE
        WHEN ps.amount_paid >= COALESCE(s.settlement_balance, 0) THEN ps.paid_at
        ELSE NULL
    END,
    updated_at = CURRENT_TIMESTAMP
FROM payment_status ps
WHERE ps.settlement_id = s.id;

UPDATE dedicated_market_settlements s
SET settled = FALSE,
    settled_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM cashbook_payments cp
    WHERE cp.reference_module = 'Dedicated Owner Payable'
      AND COALESCE(cp.reference_record_type, 'Settlement') = 'Settlement'
      AND cp.reference_record_id = s.id
);

COMMIT;
