-- Patch Date: 2026-02-28
-- Purpose: Remove Vehicle Master bank details section from backend schema

BEGIN;

ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS bank_name;
ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS branch;
ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS account_number;
ALTER TABLE IF EXISTS vehicles DROP COLUMN IF EXISTS ifsc_code;

COMMIT;
