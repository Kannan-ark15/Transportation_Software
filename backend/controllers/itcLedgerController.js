const pool = require('../config/database');

const GST_REGEX = /^\d{2}[A-Z0-9]{10}[A-Z]\dZ[A-Z0-9]$/;

const toNumber = (value, fallback = NaN) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
};

const parseDate = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
};

const parseOptionalPositiveInt = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

const getTaxSplitError = ({ cgst, sgst, igst }) => {
    if (igst > 0 && (cgst > 0 || sgst > 0)) {
        return 'If IGST is entered, CGST and SGST must be 0';
    }
    return null;
};

const buildSelectClause = () => `
    SELECT
        ile.id,
        ile.vendor_name,
        ile.vendor_gst_number,
        ile.invoice_number,
        ile.invoice_date,
        ile.purchase_amount,
        ile.cgst,
        ile.sgst,
        ile.igst,
        ile.total_gst,
        ile.invoice_total,
        ile.created_by,
        ile.updated_by,
        ile.created_at,
        ile.updated_at
    FROM itc_ledger_entries ile
`;

const normalizeRow = (row) => {
    if (!row) return row;
    return {
        ...row,
        purchase_amount: toNumber(row.purchase_amount, 0),
        cgst: toNumber(row.cgst, 0),
        sgst: toNumber(row.sgst, 0),
        igst: toNumber(row.igst, 0),
        total_gst: toNumber(row.total_gst, 0),
        invoice_total: toNumber(row.invoice_total, 0)
    };
};

const parseAndValidatePayload = (body = {}) => {
    const vendorName = normalizeText(body.vendor_name);
    const vendorGstNumber = (normalizeText(body.vendor_gst_number) || '').toUpperCase();
    const invoiceNumber = normalizeText(body.invoice_number);
    const invoiceDate = parseDate(body.invoice_date);

    const purchaseAmount = round2(toNumber(body.purchase_amount, NaN));
    const cgst = round2(toNumber(body.cgst, 0));
    const sgst = round2(toNumber(body.sgst, 0));
    const igst = round2(toNumber(body.igst, 0));

    const createdBy = parseOptionalPositiveInt(body.created_by);
    const updatedBy = parseOptionalPositiveInt(body.updated_by);

    if (!vendorName) return { error: 'vendor_name is required' };
    if (!vendorGstNumber || !GST_REGEX.test(vendorGstNumber)) {
        return { error: 'Valid vendor_gst_number is required' };
    }
    if (!invoiceNumber) return { error: 'invoice_number is required' };
    if (!/^\d+$/.test(invoiceNumber)) {
        return { error: 'invoice_number must be numeric' };
    }
    if (!invoiceDate) return { error: 'Valid invoice_date is required' };
    if (invoiceDate > new Date().toISOString().slice(0, 10)) {
        return { error: 'Future invoice_date is not allowed' };
    }
    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
        return { error: 'purchase_amount must be greater than 0' };
    }
    if (cgst < 0 || sgst < 0 || igst < 0) {
        return { error: 'CGST, SGST and IGST cannot be negative' };
    }

    const taxSplitError = getTaxSplitError({ cgst, sgst, igst });
    if (taxSplitError) return { error: taxSplitError };

    const totalGst = round2(cgst + sgst + igst);
    const invoiceTotal = round2(purchaseAmount + totalGst);

    return {
        data: {
            vendor_name: vendorName,
            vendor_gst_number: vendorGstNumber,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            purchase_amount: purchaseAmount,
            cgst,
            sgst,
            igst,
            total_gst: totalGst,
            invoice_total: invoiceTotal,
            created_by: createdBy,
            updated_by: updatedBy
        }
    };
};

const getItcLedgerMeta = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                title: 'ITC LEDGER (Import Table)',
                fields: [
                    { key: 'vendor_name', type: 'Text', entry_method: 'Manual', mandatory: true, searchable: true, home_page: true },
                    { key: 'vendor_gst_number', type: 'Alphanumeric', entry_method: 'Manual', mandatory: true, searchable: false, home_page: true },
                    { key: 'invoice_number', type: 'Numeric', entry_method: 'Manual', mandatory: true, searchable: true, home_page: true },
                    { key: 'invoice_date', type: 'Date', entry_method: 'Manual', mandatory: true, searchable: true, home_page: true },
                    { key: 'purchase_amount', type: 'Amount', entry_method: 'Manual', mandatory: true, searchable: false, home_page: false },
                    { key: 'cgst', type: 'Amount', entry_method: 'Manual', rule: 'If IGST is entered, CGST = 0', mandatory: true, searchable: false, home_page: false },
                    { key: 'sgst', type: 'Amount', entry_method: 'Manual', rule: 'If IGST is entered, SGST = 0', mandatory: true, searchable: false, home_page: false },
                    { key: 'igst', type: 'Amount', entry_method: 'Manual', rule: 'If CGST or SGST is entered, IGST = 0', mandatory: true, searchable: false, home_page: false },
                    { key: 'total_gst', type: 'Amount', entry_method: 'Calculate', rule: 'Total GST = CGST + SGST + IGST', mandatory: true, searchable: false, home_page: true },
                    { key: 'invoice_total', type: 'Amount', entry_method: 'Calculate', rule: 'Invoice Total = Purchase Amount + Total GST', mandatory: true, searchable: false, home_page: true }
                ],
                searchable_fields: ['vendor_name', 'invoice_number', 'invoice_date'],
                home_page_fields: ['vendor_name', 'vendor_gst_number', 'invoice_number', 'invoice_date', 'total_gst', 'invoice_total'],
                notes: [
                    'All entries in the Purchase GST Tracker have been verified against the uploaded GSTR-2B data.',
                    'Invoices that successfully matched (based on GSTIN, invoice number, and tax details) have been moved to the ITC Ledger and are now available for ITC utilisation.',
                    'Invoices that did not match or showed discrepancies have been retained in the Purchase GST Tracker for review and follow-up.'
                ]
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllItcLedgerEntries = async (req, res, next) => {
    try {
        const result = await pool.query(
            `${buildSelectClause()}
             ORDER BY ile.invoice_date DESC, ile.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows.map(normalizeRow) });
    } catch (error) {
        next(error);
    }
};

const getItcLedgerEntryById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const result = await pool.query(
            `${buildSelectClause()}
             WHERE ile.id = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'ITC Ledger entry not found' });
        }

        res.status(200).json({ success: true, data: normalizeRow(result.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const createItcLedgerEntry = async (req, res, next) => {
    try {
        const parsed = parseAndValidatePayload(req.body);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const payload = parsed.data;

        const insertResult = await pool.query(
            `INSERT INTO itc_ledger_entries (
                vendor_name,
                vendor_gst_number,
                invoice_number,
                invoice_date,
                purchase_amount,
                cgst,
                sgst,
                igst,
                total_gst,
                invoice_total,
                created_by
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
            )
            RETURNING id`,
            [
                payload.vendor_name,
                payload.vendor_gst_number,
                payload.invoice_number,
                payload.invoice_date,
                payload.purchase_amount,
                payload.cgst,
                payload.sgst,
                payload.igst,
                payload.total_gst,
                payload.invoice_total,
                payload.created_by
            ]
        );

        const id = insertResult.rows[0]?.id;
        const rowResult = await pool.query(
            `${buildSelectClause()} WHERE ile.id = $1`,
            [id]
        );

        res.status(201).json({ success: true, data: normalizeRow(rowResult.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const updateItcLedgerEntry = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const existing = await pool.query('SELECT id FROM itc_ledger_entries WHERE id = $1', [id]);
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: 'ITC Ledger entry not found' });
        }

        const parsed = parseAndValidatePayload(req.body);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const payload = parsed.data;

        await pool.query(
            `UPDATE itc_ledger_entries
             SET vendor_name = $2,
                 vendor_gst_number = $3,
                 invoice_number = $4,
                 invoice_date = $5,
                 purchase_amount = $6,
                 cgst = $7,
                 sgst = $8,
                 igst = $9,
                 total_gst = $10,
                 invoice_total = $11,
                 updated_by = $12
             WHERE id = $1`,
            [
                id,
                payload.vendor_name,
                payload.vendor_gst_number,
                payload.invoice_number,
                payload.invoice_date,
                payload.purchase_amount,
                payload.cgst,
                payload.sgst,
                payload.igst,
                payload.total_gst,
                payload.invoice_total,
                payload.updated_by
            ]
        );

        const rowResult = await pool.query(
            `${buildSelectClause()} WHERE ile.id = $1`,
            [id]
        );

        res.status(200).json({ success: true, data: normalizeRow(rowResult.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const deleteItcLedgerEntry = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const result = await pool.query('DELETE FROM itc_ledger_entries WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'ITC Ledger entry not found' });
        }

        res.status(200).json({ success: true, message: 'ITC Ledger entry deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getItcLedgerMeta,
    getAllItcLedgerEntries,
    getItcLedgerEntryById,
    createItcLedgerEntry,
    updateItcLedgerEntry,
    deleteItcLedgerEntry
};
