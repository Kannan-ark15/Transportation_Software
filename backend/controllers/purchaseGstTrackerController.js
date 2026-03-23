const pool = require('../config/database');

const GST_REGEX = /^\d{2}[A-Z0-9]{10}[A-Z]\dZ[A-Z0-9]$/;
const MAX_BILL_DOCUMENT_BASE64_LENGTH = 8_000_000;

const EXPENSE_TYPE_MAP = {
    'Transport Operations': [
        'Vehicle Maintenance & Repairs',
        'Spare Parts Purchases',
        'Tyre Purchases',
        'Vehicle Insurance',
        'Vehicle Permit & Road Tax'
    ],
    'Admin / Office Expenses': [
        'Office Rent',
        'Electricity Charges',
        'Internet & Mobile Bills',
        'Office Supplies & Stationary',
        'Software Subscriptions'
    ],
    'Vendor & Service Purchases': [
        'Courier / Delivery Charges',
        'Warehouse Charges'
    ],
    'Capital / Asset Purchases': [
        'Vehicle Purchase',
        'Machinery & Equipment',
        'Office Equipment'
    ]
};

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

const parseDate = (dateString) => {
    const value = normalizeText(dateString);
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : value;
};

const parseOptionalPositiveInt = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

const getTaxSplitError = ({ cgst, sgst, igst }) => {
    const hasIgst = igst > 0;
    const hasCgst = cgst > 0;
    const hasSgst = sgst > 0;

    if (hasIgst && (hasCgst || hasSgst)) {
        return 'If IGST is entered, CGST and SGST must be 0';
    }
    if (hasIgst) return null;
    if (!hasCgst && !hasSgst) {
        return 'Enter IGST or both CGST and SGST';
    }
    if (!hasCgst || !hasSgst) {
        return 'For intra-state purchases, both CGST and SGST are required';
    }
    return null;
};

const getExpenseTypeList = () => Object.keys(EXPENSE_TYPE_MAP).map((type) => ({
    type,
    sub_types: EXPENSE_TYPE_MAP[type]
}));

const buildSelectClause = (includeDocument = false) => `
    SELECT
        pge.id,
        pge.vendor_name,
        pge.vendor_gst,
        pge.reference_number,
        pge.invoice_number,
        pge.invoice_date,
        pge.expense_type,
        pge.expense_sub_type,
        pge.description,
        pge.purchase_amount,
        pge.cgst,
        pge.sgst,
        pge.igst,
        pge.total_gst,
        pge.invoice_total,
        pge.bill_document_name,
        pge.bill_document_mime,
        pge.created_by,
        pge.updated_by,
        pge.created_at,
        pge.updated_at,
        CASE
            WHEN COALESCE(pge.bill_document_base64, '') = '' THEN FALSE
            ELSE TRUE
        END AS has_bill
        ${includeDocument ? ', pge.bill_document_base64' : ''}
    FROM purchase_gst_entries pge
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
        invoice_total: toNumber(row.invoice_total, 0),
        has_bill: row.has_bill === true
    };
};

const parseAndValidatePayload = (body = {}, isUpdate = false) => {
    const vendorName = normalizeText(body.vendor_name);
    const vendorGst = (normalizeText(body.vendor_gst) || '').toUpperCase();
    const referenceNumber = normalizeText(body.reference_number);
    const invoiceNumber = normalizeText(body.invoice_number);
    const invoiceDate = parseDate(body.invoice_date);
    const expenseType = normalizeText(body.expense_type);
    const expenseSubType = normalizeText(body.expense_sub_type);
    const description = normalizeText(body.description);

    const purchaseAmount = round2(toNumber(body.purchase_amount, NaN));
    const cgst = round2(toNumber(body.cgst, 0));
    const sgst = round2(toNumber(body.sgst, 0));
    const igst = round2(toNumber(body.igst, 0));

    const billDocumentName = normalizeText(body.bill_document_name);
    const billDocumentMime = normalizeText(body.bill_document_mime) || null;
    const billDocumentBase64 = normalizeText(body.bill_document_base64);

    const createdBy = parseOptionalPositiveInt(body.created_by);
    const updatedBy = parseOptionalPositiveInt(body.updated_by);

    if (!vendorName) return { error: 'vendor_name is required' };
    if (!vendorGst || !GST_REGEX.test(vendorGst)) {
        return { error: 'Valid vendor_gst is required' };
    }
    if (!referenceNumber) return { error: 'reference_number is required' };
    if (!invoiceNumber) return { error: 'invoice_number is required' };
    if (!/^\d+$/.test(invoiceNumber)) {
        return { error: 'invoice_number must be numeric' };
    }
    if (!invoiceDate) return { error: 'Valid invoice_date is required' };
    if (!expenseType || !EXPENSE_TYPE_MAP[expenseType]) {
        return { error: 'Valid expense_type is required' };
    }
    if (!expenseSubType || !EXPENSE_TYPE_MAP[expenseType].includes(expenseSubType)) {
        return { error: 'Valid expense_sub_type is required for the selected expense_type' };
    }
    if (!description) return { error: 'description is required' };
    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
        return { error: 'purchase_amount must be greater than 0' };
    }
    if (cgst < 0 || sgst < 0 || igst < 0) {
        return { error: 'CGST, SGST and IGST cannot be negative' };
    }

    const taxSplitError = getTaxSplitError({ cgst, sgst, igst });
    if (taxSplitError) return { error: taxSplitError };

    if (billDocumentBase64 && !billDocumentName) {
        return { error: 'bill_document_name is required when bill document is uploaded' };
    }
    if (billDocumentBase64 && billDocumentBase64.length > MAX_BILL_DOCUMENT_BASE64_LENGTH) {
        return { error: 'Uploaded bill is too large. Please upload a smaller document.' };
    }

    const totalGst = round2(cgst + sgst + igst);
    const invoiceTotal = round2(purchaseAmount + totalGst);

    return {
        data: {
            vendor_name: vendorName,
            vendor_gst: vendorGst,
            reference_number: referenceNumber,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            expense_type: expenseType,
            expense_sub_type: expenseSubType,
            description,
            purchase_amount: purchaseAmount,
            cgst,
            sgst,
            igst,
            total_gst: totalGst,
            invoice_total: invoiceTotal,
            bill_document_name: billDocumentName,
            bill_document_mime: billDocumentMime,
            bill_document_base64: billDocumentBase64,
            created_by: createdBy,
            updated_by: updatedBy,
            is_update: isUpdate
        }
    };
};

const getPurchaseGstTrackerMeta = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                expense_types: getExpenseTypeList(),
                rules: {
                    tax_split: 'If IGST is entered, CGST and SGST must be 0. If IGST is 0, both CGST and SGST are required.',
                    total_gst: 'Total GST = CGST + SGST + IGST',
                    invoice_total: 'Invoice Total = Purchase Amount + Total GST'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllPurchaseGstEntries = async (req, res, next) => {
    try {
        const result = await pool.query(
            `${buildSelectClause(false)}
             ORDER BY pge.invoice_date DESC, pge.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows.map(normalizeRow) });
    } catch (error) {
        next(error);
    }
};

const getPurchaseGstEntryById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const result = await pool.query(
            `${buildSelectClause(true)}
             WHERE pge.id = $1`,
            [id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Purchase GST entry not found' });
        }

        res.status(200).json({ success: true, data: normalizeRow(result.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const createPurchaseGstEntry = async (req, res, next) => {
    try {
        const parsed = parseAndValidatePayload(req.body);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

        const payload = parsed.data;
        const insertResult = await pool.query(
            `INSERT INTO purchase_gst_entries (
                vendor_name,
                vendor_gst,
                reference_number,
                invoice_number,
                invoice_date,
                expense_type,
                expense_sub_type,
                description,
                purchase_amount,
                cgst,
                sgst,
                igst,
                total_gst,
                invoice_total,
                bill_document_name,
                bill_document_mime,
                bill_document_base64,
                created_by
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
            )
            RETURNING id`,
            [
                payload.vendor_name,
                payload.vendor_gst,
                payload.reference_number,
                payload.invoice_number,
                payload.invoice_date,
                payload.expense_type,
                payload.expense_sub_type,
                payload.description,
                payload.purchase_amount,
                payload.cgst,
                payload.sgst,
                payload.igst,
                payload.total_gst,
                payload.invoice_total,
                payload.bill_document_name,
                payload.bill_document_mime,
                payload.bill_document_base64,
                payload.created_by
            ]
        );

        const id = insertResult.rows[0]?.id;
        const rowResult = await pool.query(
            `${buildSelectClause(false)} WHERE pge.id = $1`,
            [id]
        );

        res.status(201).json({ success: true, data: normalizeRow(rowResult.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const updatePurchaseGstEntry = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const existing = await pool.query('SELECT id FROM purchase_gst_entries WHERE id = $1', [id]);
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: 'Purchase GST entry not found' });
        }

        const parsed = parseAndValidatePayload(req.body, true);
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const payload = parsed.data;

        await pool.query(
            `UPDATE purchase_gst_entries
             SET vendor_name = $2,
                 vendor_gst = $3,
                 reference_number = $4,
                 invoice_number = $5,
                 invoice_date = $6,
                 expense_type = $7,
                 expense_sub_type = $8,
                 description = $9,
                 purchase_amount = $10,
                 cgst = $11,
                 sgst = $12,
                 igst = $13,
                 total_gst = $14,
                 invoice_total = $15,
                 bill_document_name = $16,
                 bill_document_mime = $17,
                 bill_document_base64 = $18,
                 updated_by = $19
             WHERE id = $1`,
            [
                id,
                payload.vendor_name,
                payload.vendor_gst,
                payload.reference_number,
                payload.invoice_number,
                payload.invoice_date,
                payload.expense_type,
                payload.expense_sub_type,
                payload.description,
                payload.purchase_amount,
                payload.cgst,
                payload.sgst,
                payload.igst,
                payload.total_gst,
                payload.invoice_total,
                payload.bill_document_name,
                payload.bill_document_mime,
                payload.bill_document_base64,
                payload.updated_by
            ]
        );

        const rowResult = await pool.query(
            `${buildSelectClause(false)} WHERE pge.id = $1`,
            [id]
        );

        res.status(200).json({ success: true, data: normalizeRow(rowResult.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const deletePurchaseGstEntry = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid entry id is required' });
        }

        const result = await pool.query('DELETE FROM purchase_gst_entries WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Purchase GST entry not found' });
        }

        res.status(200).json({ success: true, message: 'Purchase GST entry deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPurchaseGstTrackerMeta,
    getAllPurchaseGstEntries,
    getPurchaseGstEntryById,
    createPurchaseGstEntry,
    updatePurchaseGstEntry,
    deletePurchaseGstEntry
};
