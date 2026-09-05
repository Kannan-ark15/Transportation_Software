-- Patch Date: 2026-08-03
-- Purpose: Restore acknowledgement readiness when every invoice is acknowledged.

BEGIN;

UPDATE acknowledgements a
SET voucher_status = 'Ready for Settlement',
    updated_at = CURRENT_TIMESTAMP
WHERE voucher_status <> 'Ready for Settlement'
  AND EXISTS (
      SELECT 1
      FROM acknowledgement_invoices ai
      WHERE ai.acknowledgement_id = a.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM acknowledgement_invoices ai
      WHERE ai.acknowledgement_id = a.id
        AND ai.status <> 'Acknowledged'
  );

UPDATE acknowledgements a
SET voucher_status = 'Pending',
    updated_at = CURRENT_TIMESTAMP
WHERE voucher_status <> 'Pending'
  AND NOT EXISTS (
      SELECT 1
      FROM dedicated_market_settlement_vouchers dmsv
      WHERE dmsv.acknowledgement_id = a.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM own_vehicle_settlement_vouchers ovsv
      WHERE ovsv.acknowledgement_id = a.id
  )
  AND EXISTS (
      SELECT 1
      FROM acknowledgement_invoices ai
      WHERE ai.acknowledgement_id = a.id
        AND ai.status <> 'Acknowledged'
  );
  
COMMIT;
