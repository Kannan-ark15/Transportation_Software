-- Patch Date: 2026-02-28
-- Purpose: Ensure GST number is not UNIQUE in any master table (including owners)

BEGIN;

-- Drop any single-column UNIQUE constraints defined on gst_no across public schema
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

COMMIT;

