-- Patch Date: 2026-05-12
-- Purpose:
-- Owner Master rule update:
-- 1) For Market owner entries, optional identity/contact/bank fields may be blank
-- 2) Store blank optional values as NULL so unique indexes do not treat blanks as duplicates

BEGIN;

DO $$
DECLARE
    optional_col TEXT;
BEGIN
    FOREACH optional_col IN ARRAY ARRAY[
        'pan_no',
        'aadhar_no',
        'gst_no',
        'company_address',
        'place',
        'contact_no',
        'email_id',
        'bank_name',
        'branch',
        'ifsc_code',
        'account_no'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'owners'
              AND column_name = optional_col
        ) THEN
            EXECUTE format('ALTER TABLE owners ALTER COLUMN %I DROP NOT NULL', optional_col);
        END IF;
    END LOOP;
END;
$$;

UPDATE owners SET pan_no = NULL WHERE pan_no IS NOT NULL AND BTRIM(pan_no) = '';
UPDATE owners SET aadhar_no = NULL WHERE aadhar_no IS NOT NULL AND BTRIM(aadhar_no) = '';
UPDATE owners SET gst_no = NULL WHERE gst_no IS NOT NULL AND BTRIM(gst_no) = '';
UPDATE owners SET company_address = NULL WHERE company_address IS NOT NULL AND BTRIM(company_address) = '';
UPDATE owners SET place = NULL WHERE place IS NOT NULL AND BTRIM(place) = '';
UPDATE owners SET contact_no = NULL WHERE contact_no IS NOT NULL AND BTRIM(contact_no) = '';
UPDATE owners SET email_id = NULL WHERE email_id IS NOT NULL AND BTRIM(email_id) = '';
UPDATE owners SET bank_name = NULL WHERE bank_name IS NOT NULL AND BTRIM(bank_name) = '';
UPDATE owners SET branch = NULL WHERE branch IS NOT NULL AND BTRIM(branch) = '';
UPDATE owners SET ifsc_code = NULL WHERE ifsc_code IS NOT NULL AND BTRIM(ifsc_code) = '';
UPDATE owners SET account_no = NULL WHERE account_no IS NOT NULL AND BTRIM(account_no) = '';

COMMIT;
