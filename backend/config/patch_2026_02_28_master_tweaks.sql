-- Patch Date: 2026-02-28
-- Purpose:
-- 1) Vehicle Master: add Vehicle Financial Status (Free/Loan) and optional bank details
-- 2) Pump Master: make GST and settlement bank fields optional
-- 3) Dealer Master: make GST/mobile/alternate/sales officer contact optional
-- 4) Place Master: enforce tarpaulin = NULL for non-open-container body types

BEGIN;

-- Keep GST non-unique across masters
ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_gst_no_key;
ALTER TABLE IF EXISTS dealers DROP CONSTRAINT IF EXISTS dealers_gst_no_key;

-- Also drop any single-column UNIQUE constraints on gst_no across all master tables (e.g., owners_gst_no_key)
DO $$
DECLARE
    row_rec RECORD;
BEGIN
    FOR row_rec IN
        SELECT n.nspname AS schema_name,
               t.relname AS table_name,
               c.conname AS constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'u'
            AND n.nspname = 'public'
            AND array_length(c.conkey, 1) = 1
            AND a.attname = 'gst_no'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
            row_rec.schema_name,
            row_rec.table_name,
            row_rec.constraint_name
        );
    END LOOP;
END;
$$;

-- Vehicle Master: new financial status + bank fields
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS vehicle_financial_status VARCHAR(20) DEFAULT 'Free';
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS branch VARCHAR(255);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS account_number VARCHAR(30);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);

UPDATE vehicles
SET vehicle_financial_status = 'Free'
WHERE vehicle_financial_status IS NULL
    OR TRIM(vehicle_financial_status) = '';

ALTER TABLE IF EXISTS vehicles ALTER COLUMN vehicle_financial_status SET DEFAULT 'Free';
ALTER TABLE IF EXISTS vehicles ALTER COLUMN vehicle_financial_status SET NOT NULL;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_financial_status_check;
ALTER TABLE IF EXISTS vehicles
    ADD CONSTRAINT vehicles_financial_status_check CHECK (vehicle_financial_status IN ('Free', 'Loan'));

-- Vehicle Master: compliance, technical, and bank fields are optional
DO $$
DECLARE
    optional_col TEXT;
BEGIN
    FOREACH optional_col IN ARRAY ARRAY[
        'engine_no',
        'chasis_no',
        'pollution_no',
        'pollution_expiry_date',
        'permit_no',
        'permit_from_date',
        'permit_till_date',
        'fc_no',
        'fc_from_date',
        'fc_till_date',
        'bank_name',
        'branch',
        'account_number',
        'ifsc_code'
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

-- Pump Master: GST + settlement bank optional
ALTER TABLE IF EXISTS pumps ALTER COLUMN gst_no DROP NOT NULL;
ALTER TABLE IF EXISTS pumps ALTER COLUMN bank_name DROP NOT NULL;
ALTER TABLE IF EXISTS pumps ALTER COLUMN branch DROP NOT NULL;
ALTER TABLE IF EXISTS pumps ALTER COLUMN account_number DROP NOT NULL;
ALTER TABLE IF EXISTS pumps ALTER COLUMN ifsc_code DROP NOT NULL;

-- Dealer Master: GST + contacts optional
ALTER TABLE IF EXISTS dealers ALTER COLUMN gst_no DROP NOT NULL;
ALTER TABLE IF EXISTS dealers ALTER COLUMN contact_no_1 DROP NOT NULL;
ALTER TABLE IF EXISTS dealers ALTER COLUMN contact_no_2 DROP NOT NULL;
ALTER TABLE IF EXISTS dealers ALTER COLUMN sales_officer_no DROP NOT NULL;

-- Place Master: tarpaulin must be null for non-open-container body types
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'rate_cards'
    ) THEN
        UPDATE rate_cards
        SET tarpaulin = NULL
        WHERE LOWER(COALESCE(vehicle_body_type, '')) <> 'open container';

        ALTER TABLE rate_cards DROP CONSTRAINT IF EXISTS rate_cards_tarpaulin_open_container_check;
        ALTER TABLE rate_cards
            ADD CONSTRAINT rate_cards_tarpaulin_open_container_check
            CHECK (LOWER(COALESCE(vehicle_body_type, '')) = 'open container' OR tarpaulin IS NULL);
    END IF;
END;
$$;

COMMIT;
