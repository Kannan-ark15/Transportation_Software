-- Patch Date: 2026-02-28
-- Purpose: Voucher Summary revamp for Acknowledgement Transaction
-- 1) Voucher status states: Pending / Ready for Settlement
-- 2) Migrate existing Settled values to Ready for Settlement

BEGIN;

UPDATE acknowledgements
SET voucher_status = 'Ready for Settlement'
WHERE voucher_status = 'Settled';

ALTER TABLE IF EXISTS acknowledgements DROP CONSTRAINT IF EXISTS acknowledgements_voucher_status_check;
ALTER TABLE IF EXISTS acknowledgements
    ADD CONSTRAINT acknowledgements_voucher_status_check
    CHECK (voucher_status IN ('Pending', 'Ready for Settlement'));

COMMIT;

