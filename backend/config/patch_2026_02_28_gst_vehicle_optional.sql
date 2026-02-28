-- Patch Date: 2026-02-28
-- Purpose:
-- 1) Allow duplicate GST numbers across masters (companies/dealers)
-- 2) Make Vehicle Master Technical + Compliance document fields optional

BEGIN;

-- 1) GST no longer unique in company/dealer masters
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

-- 2) Vehicle Master sections made optional (drop NOT NULL where present)
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
        'fc_till_date'
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

COMMIT;
