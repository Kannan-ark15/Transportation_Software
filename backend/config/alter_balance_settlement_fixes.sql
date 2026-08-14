-- Balance settlement database alterations
-- Run this once against an existing Transport database after the base schema.
-- The statements are idempotent and safe to rerun.

BEGIN;

-- Preserve stable source links for settlement-ready loading advances.
ALTER TABLE IF EXISTS loading_advances
    ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS loading_advances
    ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(id) ON DELETE RESTRICT;

-- Keep older own-vehicle settlement schemas compatible with advance recovery.
ALTER TABLE IF EXISTS own_vehicle_settlements
    ADD COLUMN IF NOT EXISTS pending_advance DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS voucher_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS to_place VARCHAR(255);

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS deduction DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS fuel_litre DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS last_odometer DECIMAL(12, 3);

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS current_odometer DECIMAL(12, 3);

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS run_kms DECIMAL(12, 3);

ALTER TABLE IF EXISTS own_vehicle_settlement_vouchers
    ADD COLUMN IF NOT EXISTS mileage DECIMAL(12, 3);

-- Link advance recoveries to the own-vehicle settlement that performed them.
DO $$
BEGIN
    IF to_regclass('public.driver_advance_recoveries') IS NOT NULL
       AND to_regclass('public.own_vehicle_settlements') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conname = 'driver_advance_recoveries_own_vehicle_settlement_id_fkey'
       ) THEN
        ALTER TABLE driver_advance_recoveries
            ADD CONSTRAINT driver_advance_recoveries_own_vehicle_settlement_id_fkey
            FOREIGN KEY (own_vehicle_settlement_id)
            REFERENCES own_vehicle_settlements(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- Backfill stable links where the old text values identify exactly one master.
UPDATE loading_advances la
SET owner_id = o.id
FROM owners o
WHERE la.owner_id IS NULL
  AND o.owner_name = la.owner_name
  AND o.owner_type = la.owner_type;

UPDATE loading_advances la
SET driver_id = d.id
FROM drivers d
WHERE la.driver_id IS NULL
  AND la.owner_type = 'Own'
  AND d.driver_name = la.driver_name
  AND d.driver_status = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM drivers d2
      WHERE d2.driver_name = la.driver_name
        AND d2.driver_status = TRUE
        AND d2.id <> d.id
  );

COMMIT;
