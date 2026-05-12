-- Patch Date: 2026-05-12
-- Purpose:
-- Vehicle Master rule update:
-- 1) For Dedicated vehicle entries, Insurance Details are optional
-- 2) For Own vehicle entries, Insurance Details remain mandatory
-- 3) Market vehicle entries continue to require only vehicle_no

BEGIN;

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
            AND (
                LOWER(COALESCE(own_dedicated, '')) = 'dedicated'
                OR (
                    insurance_no IS NOT NULL AND BTRIM(insurance_no) <> ''
                    AND insurance_base_value IS NOT NULL
                    AND insurance_amount IS NOT NULL
                )
            )
        )
    );

COMMIT;
