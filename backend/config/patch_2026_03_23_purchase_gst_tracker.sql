-- Purchase GST Tracker (Input GST)

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS purchase_gst_entries (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gst VARCHAR(15) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    expense_type VARCHAR(80) NOT NULL,
    expense_sub_type VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    purchase_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    igst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_gst DECIMAL(12, 2) NOT NULL DEFAULT 0,
    invoice_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bill_document_name TEXT,
    bill_document_mime TEXT,
    bill_document_base64 TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_purchase_gst_amounts_non_negative
        CHECK (
            purchase_amount >= 0
            AND cgst >= 0
            AND sgst >= 0
            AND igst >= 0
            AND total_gst >= 0
            AND invoice_total >= 0
        )
);

CREATE INDEX IF NOT EXISTS idx_purchase_gst_entries_vendor_name
    ON purchase_gst_entries(vendor_name);
CREATE INDEX IF NOT EXISTS idx_purchase_gst_entries_vendor_gst
    ON purchase_gst_entries(vendor_gst);
CREATE INDEX IF NOT EXISTS idx_purchase_gst_entries_invoice_number
    ON purchase_gst_entries(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_gst_entries_invoice_date
    ON purchase_gst_entries(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_gst_entries_expense_type
    ON purchase_gst_entries(expense_type);

DROP TRIGGER IF EXISTS update_purchase_gst_entries_updated_at ON purchase_gst_entries;
CREATE TRIGGER update_purchase_gst_entries_updated_at
    BEFORE UPDATE ON purchase_gst_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
