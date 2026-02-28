-- Patch Date: 2026-02-28
-- Purpose: Ensure contact numbers are not UNIQUE in master tables

BEGIN;

-- Drop single-column UNIQUE constraints on contact number fields
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
            AND a.attname IN ('contact_no', 'primary_contact_no', 'secondary_contact_no', 'contact_no_1', 'contact_no_2', 'sales_officer_no')
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

-- Drop standalone single-column UNIQUE indexes on contact number fields
DO $$
DECLARE
    idx_rec RECORD;
BEGIN
    FOR idx_rec IN
        SELECT n.nspname AS schema_name,
               i.relname AS index_name
        FROM pg_index ix
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ix.indkey[0]
        LEFT JOIN pg_constraint c ON c.conindid = ix.indexrelid
        WHERE ix.indisunique = true
            AND ix.indisprimary = false
            AND n.nspname = 'public'
            AND array_length(ix.indkey, 1) = 1
            AND c.oid IS NULL
            AND a.attname IN ('contact_no', 'primary_contact_no', 'secondary_contact_no', 'contact_no_1', 'contact_no_2', 'sales_officer_no')
    LOOP
        EXECUTE format(
            'DROP INDEX IF EXISTS %I.%I',
            idx_rec.schema_name,
            idx_rec.index_name
        );
    END LOOP;
END;
$$;

COMMIT;
