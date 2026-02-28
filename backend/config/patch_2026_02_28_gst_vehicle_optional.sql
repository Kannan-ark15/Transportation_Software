-- Patch Date: 2026-02-28
-- Purpose:
-- 1) Allow duplicate GST numbers across masters (companies/dealers)
-- 2) Make Vehicle Master Technical + Compliance document fields optional

BEGIN;

-- 1) GST no longer unique in company/dealer masters
ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_gst_no_key;
ALTER TABLE IF EXISTS dealers DROP CONSTRAINT IF EXISTS dealers_gst_no_key;

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

