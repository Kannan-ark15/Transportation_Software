-- Patch Date: 2026-08-29
-- Purpose: Keep dedicated/market balance settlements pending until their payment is recorded.

BEGIN;

ALTER TABLE IF EXISTS dedicated_market_settlements
    ADD COLUMN IF NOT EXISTS settled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS dedicated_market_settlements
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS dedicated_market_settlements
    ALTER COLUMN settled SET DEFAULT FALSE;

ALTER TABLE IF EXISTS dedicated_market_settlements
    ALTER COLUMN settled_at DROP DEFAULT;

COMMIT;
