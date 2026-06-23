-- Station Module: products, tanks, dispensers, nozzles, and daily fuel rates

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS station_product_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS station_dispenser_seq START WITH 1;

CREATE TABLE IF NOT EXISTS station_products (
    product_id VARCHAR(50) PRIMARY KEY DEFAULT 'PRD' || lpad(nextval('station_product_seq')::text, 2, '0'),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_tanks (
    tank_id VARCHAR(50) PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL REFERENCES station_products(product_code) ON UPDATE CASCADE,
    capacity DECIMAL(12, 2) NOT NULL,
    product_id VARCHAR(50) NOT NULL REFERENCES station_products(product_id) ON UPDATE CASCADE,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_dispensers (
    dispenser_id VARCHAR(50) PRIMARY KEY DEFAULT 'DU' || lpad(nextval('station_dispenser_seq')::text, 2, '0'),
    dispenser_no VARCHAR(50) UNIQUE NOT NULL,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_nozzles (
    nozzle_id VARCHAR(50) PRIMARY KEY,
    dispenser_no VARCHAR(50) NOT NULL REFERENCES station_dispensers(dispenser_no) ON UPDATE CASCADE,
    tank_id VARCHAR(50) NOT NULL REFERENCES station_tanks(tank_id) ON UPDATE CASCADE,
    product_code VARCHAR(50) NOT NULL REFERENCES station_products(product_code) ON UPDATE CASCADE,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_rates (
    rate_id SERIAL PRIMARY KEY,
    effective_date DATE NOT NULL,
    product_code VARCHAR(50) NOT NULL REFERENCES station_products(product_code) ON UPDATE CASCADE,
    rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_code, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_station_products_status ON station_products(status);
CREATE INDEX IF NOT EXISTS idx_station_tanks_product_code ON station_tanks(product_code);
CREATE INDEX IF NOT EXISTS idx_station_nozzles_dispenser_no ON station_nozzles(dispenser_no);
CREATE INDEX IF NOT EXISTS idx_station_nozzles_product_code ON station_nozzles(product_code);
CREATE INDEX IF NOT EXISTS idx_station_rates_product_date ON station_rates(product_code, effective_date DESC);

DROP TRIGGER IF EXISTS update_station_products_updated_at ON station_products;
CREATE TRIGGER update_station_products_updated_at
    BEFORE UPDATE ON station_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_tanks_updated_at ON station_tanks;
CREATE TRIGGER update_station_tanks_updated_at
    BEFORE UPDATE ON station_tanks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_dispensers_updated_at ON station_dispensers;
CREATE TRIGGER update_station_dispensers_updated_at
    BEFORE UPDATE ON station_dispensers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_nozzles_updated_at ON station_nozzles;
CREATE TRIGGER update_station_nozzles_updated_at
    BEFORE UPDATE ON station_nozzles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_rates_updated_at ON station_rates;
CREATE TRIGGER update_station_rates_updated_at
    BEFORE UPDATE ON station_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
