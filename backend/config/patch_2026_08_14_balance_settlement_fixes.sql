-- Patch Date: 2026-08-14
-- Purpose: Preserve stable owner/driver links for settlement source vouchers.

BEGIN;

-- Some deployments created the source transaction tables without running the
-- settlement section of database.sql. Create those tables here before the
-- readiness patch references them.
CREATE TABLE IF NOT EXISTS dedicated_market_settlements (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
    owner_name VARCHAR(255) NOT NULL,
    owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('Dedicated', 'Market')),
    cash_bank VARCHAR(10) NOT NULL CHECK (cash_bank IN ('Cash', 'Bank')),
    bank_name VARCHAR(255),
    branch VARCHAR(255),
    account_no VARCHAR(30),
    ifsc_code VARCHAR(20),
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_percent DECIMAL(6, 4) NOT NULL DEFAULT 6,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settlement_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settled BOOLEAN NOT NULL DEFAULT TRUE,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dedicated_market_settlement_vouchers (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER REFERENCES dedicated_market_settlements(id) ON DELETE CASCADE,
    acknowledgement_id INTEGER REFERENCES acknowledgements(id) ON DELETE RESTRICT,
    loading_advance_id INTEGER UNIQUE REFERENCES loading_advances(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    voucher_number VARCHAR(20) NOT NULL,
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    final_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS own_vehicle_settlements (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE RESTRICT,
    driver_name VARCHAR(255) NOT NULL,
    cash_bank VARCHAR(10) NOT NULL CHECK (cash_bank IN ('Cash', 'Bank')),
    bank_name VARCHAR(255),
    branch VARCHAR(255),
    account_number VARCHAR(30),
    ifsc_code VARCHAR(20),
    total_driver_bata DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_driver_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pending_advance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_salary_payable DECIMAL(12, 2) NOT NULL DEFAULT 0,
    settled BOOLEAN NOT NULL DEFAULT TRUE,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS own_vehicle_settlement_vouchers (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER REFERENCES own_vehicle_settlements(id) ON DELETE CASCADE,
    acknowledgement_id INTEGER REFERENCES acknowledgements(id) ON DELETE RESTRICT,
    loading_advance_id INTEGER UNIQUE REFERENCES loading_advances(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(50) NOT NULL,
    voucher_number VARCHAR(20) NOT NULL,
    voucher_date TIMESTAMP WITH TIME ZONE,
    to_place VARCHAR(255),
    sum_ifas DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_bata DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unloading DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tarpaulin DECIMAL(12, 2) NOT NULL DEFAULT 0,
    city_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    maintenance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    parking_charges DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_1 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_2 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expenditure_3 DECIMAL(12, 2) NOT NULL DEFAULT 0,
    deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fuel_litre DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fuel_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    driver_loading_advance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    last_odometer DECIMAL(12, 3),
    current_odometer DECIMAL(12, 3),
    run_kms DECIMAL(12, 3),
    mileage DECIMAL(12, 3),
    driver_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_advance_recoveries_own_vehicle_settlement_id_fkey'
    ) THEN
        ALTER TABLE driver_advance_recoveries
            ADD CONSTRAINT driver_advance_recoveries_own_vehicle_settlement_id_fkey
            FOREIGN KEY (own_vehicle_settlement_id)
            REFERENCES own_vehicle_settlements(id) ON DELETE CASCADE;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_dm_vouchers_settlement_id ON dedicated_market_settlement_vouchers(settlement_id);
CREATE INDEX IF NOT EXISTS idx_ov_vouchers_settlement_id ON own_vehicle_settlement_vouchers(settlement_id);

DROP TRIGGER IF EXISTS update_dedicated_market_settlements_updated_at ON dedicated_market_settlements;
CREATE TRIGGER update_dedicated_market_settlements_updated_at
    BEFORE UPDATE ON dedicated_market_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_own_vehicle_settlements_updated_at ON own_vehicle_settlements;
CREATE TRIGGER update_own_vehicle_settlements_updated_at
    BEFORE UPDATE ON own_vehicle_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE IF EXISTS loading_advances
    ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS loading_advances
    ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(id) ON DELETE RESTRICT;

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
