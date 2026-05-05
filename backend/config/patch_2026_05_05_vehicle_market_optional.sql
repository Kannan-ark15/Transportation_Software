-- Patch Date: 2026-05-05
-- Purpose:
-- Vehicle Master rule update:
-- 1) For Market vehicle entries, only vehicle_no should be mandatory
-- 2) For non-Market entries, keep existing mandatory business fields enforced
-- 3) Owner name must be optional when owner type is Market

BEGIN;

-- Allow nullable values for fields that are optional for Market records.
DO $$
DECLARE
    optional_col TEXT;
BEGIN
    FOREACH optional_col IN ARRAY ARRAY[
        'vehicle_type',
        'vehicle_sub_type',
        'vehicle_body_type',
        'brand_name',
        'own_dedicated',
        'owner_name',
        'recommended_km',
        'insurance_no',
        'insurance_base_value',
        'insurance_amount',
        'rc_expiry_date'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'vehicles'
              AND column_name = optional_col
        ) THEN
            EXECUTE format('ALTER TABLE vehicles ALTER COLUMN %I DROP NOT NULL', optional_col);
        END IF;
    END LOOP;
END;
$$;

-- Enforce non-market required fields through a conditional CHECK constraint.
ALTER TABLE IF EXISTS vehicles
    DROP CONSTRAINT IF EXISTS vehicles_required_fields_for_non_market_check;

ALTER TABLE IF EXISTS vehicles
    ADD CONSTRAINT vehicles_required_fields_for_non_market_check
    CHECK (
        LOWER(COALESCE(own_dedicated, '')) = 'market'
        OR LOWER(COALESCE(vehicle_type, '')) = 'market'
        OR (
            vehicle_type IS NOT NULL AND BTRIM(vehicle_type) <> ''
            AND vehicle_sub_type IS NOT NULL AND BTRIM(vehicle_sub_type) <> ''
            AND vehicle_body_type IS NOT NULL AND BTRIM(vehicle_body_type) <> ''
            AND brand_name IS NOT NULL AND BTRIM(brand_name) <> ''
            AND own_dedicated IS NOT NULL AND BTRIM(own_dedicated) <> ''
            AND owner_name IS NOT NULL AND BTRIM(owner_name) <> ''
            AND recommended_km IS NOT NULL
            AND insurance_no IS NOT NULL AND BTRIM(insurance_no) <> ''
            AND insurance_base_value IS NOT NULL
            AND insurance_amount IS NOT NULL
        )
    );

COMMIT;
