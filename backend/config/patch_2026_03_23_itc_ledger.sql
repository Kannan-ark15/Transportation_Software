-- ITC Ledger (Import Table)

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS itc_ledger_entries (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gst_number VARCHAR(15) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    purchase_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    igst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_gst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    invoice_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_itc_ledger_amounts_non_negative
        CHECK (
            purchase_amount >= 0
            AND cgst >= 0
            AND sgst >= 0
            AND igst >= 0
            AND total_gst >= 0
            AND invoice_total >= 0
        ),
    CONSTRAINT chk_itc_ledger_invoice_number_numeric
        CHECK (invoice_number ~ '^[0-9]+$'),
    CONSTRAINT chk_itc_ledger_tax_split
        CHECK (NOT (igst > 0 AND (cgst > 0 OR sgst > 0)))
);

CREATE INDEX IF NOT EXISTS idx_itc_ledger_entries_vendor_name
    ON itc_ledger_entries(vendor_name);
CREATE INDEX IF NOT EXISTS idx_itc_ledger_entries_invoice_number
    ON itc_ledger_entries(invoice_number);
CREATE INDEX IF NOT EXISTS idx_itc_ledger_entries_invoice_date
    ON itc_ledger_entries(invoice_date);
CREATE INDEX IF NOT EXISTS idx_itc_ledger_entries_vendor_gst_number
    ON itc_ledger_entries(vendor_gst_number);

DROP TRIGGER IF EXISTS update_itc_ledger_entries_updated_at ON itc_ledger_entries;
CREATE TRIGGER update_itc_ledger_entries_updated_at
    BEFORE UPDATE ON itc_ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
