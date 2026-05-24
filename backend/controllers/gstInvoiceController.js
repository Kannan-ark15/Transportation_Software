const pool = require('../config/database');

const DEFAULT_CGST_PERCENT = 9;
const DEFAULT_SGST_PERCENT = 9;

const toNumber = (value, fallback = NaN) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number((toNumber(value, 0)).toFixed(2));
const round3 = (value) => Number((toNumber(value, 0)).toFixed(3));

const normalizeText = (value) => {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === '' ? null : str;
};

const normalizeProductIdList = (value) => {
    if (value === null || value === undefined || value === '') return [];
    const rawList = Array.isArray(value) ? value : String(value).split(',');
    const unique = new Set();

    for (const item of rawList) {
        const parsed = Number(String(item || '').trim());
        if (Number.isInteger(parsed) && parsed > 0) {
            unique.add(parsed);
        }
    }

    return Array.from(unique);
};

const isValidDateString = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
};

const compareDateOnly = (a, b) => {
    const aDate = new Date(`${a}T00:00:00`);
    const bDate = new Date(`${b}T00:00:00`);
    if (Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime())) return NaN;
    if (aDate.getTime() === bDate.getTime()) return 0;
    return aDate.getTime() > bDate.getTime() ? 1 : -1;
};

const getFilingPeriod = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month >= 4) return `${year}-${year + 1}`;
    return `${year - 1}-${year}`;
};

const fetchProductsByIds = async (client, productIds = []) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return [];

    const result = await client.query(
        `SELECT id, product_name
         FROM products
         WHERE id = ANY($1::INT[])
         ORDER BY product_name ASC`,
        [productIds]
    );

    if (result.rows.length !== productIds.length) {
        throw new Error('One or more selected products were not found');
    }

    return result.rows;
};

const getNextBillNumberFromMax = (maxBillNumber) => {
    const nextNumber = Number(maxBillNumber || 0) + 1;
    if (!Number.isInteger(nextNumber) || nextNumber <= 0 || nextNumber > 9999) {
        throw new Error('Unable to generate bill number: 4-digit limit reached');
    }
    return String(nextNumber).padStart(4, '0');
};

const belowTwenty = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];

const tensMap = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (num) => {
    if (num < 20) return belowTwenty[num];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${tensMap[tens]}${ones ? ` ${belowTwenty[ones]}` : ''}`.trim();
};

const threeDigitsToWords = (num) => {
    if (num <= 0) return '';
    const hundreds = Math.floor(num / 100);
    const rem = num % 100;
    const parts = [];
    if (hundreds > 0) parts.push(`${belowTwenty[hundreds]} Hundred`);
    if (rem > 0) parts.push(twoDigitsToWords(rem));
    return parts.join(' ').trim();
};

const numberToWordsIndian = (amount) => {
    const normalized = round2(amount);
    if (!Number.isFinite(normalized) || normalized < 0) return '';

    const integerPart = Math.floor(normalized);
    const paise = Math.round((normalized - integerPart) * 100);

    if (integerPart === 0 && paise === 0) return 'Zero Rupees Only';

    const crore = Math.floor(integerPart / 10000000);
    const lakh = Math.floor((integerPart % 10000000) / 100000);
    const thousand = Math.floor((integerPart % 100000) / 1000);
    const hundred = integerPart % 1000;

    const words = [];
    if (crore) words.push(`${threeDigitsToWords(crore)} Crore`);
    if (lakh) words.push(`${threeDigitsToWords(lakh)} Lakh`);
    if (thousand) words.push(`${threeDigitsToWords(thousand)} Thousand`);
    if (hundred) words.push(threeDigitsToWords(hundred));

    const rupeesWords = `${words.join(' ').trim() || 'Zero'} Rupees`;
    if (paise > 0) return `${rupeesWords} and ${twoDigitsToWords(paise)} Paise Only`;
    return `${rupeesWords} Only`;
};

const getOwnerForGstHeader = async (client) => {
    const ownerRes = await client.query(
        `SELECT
            id,
            owner_name,
            company_address,
            place,
            contact_no,
            email_id,
            gst_no,
            pan_no,
            owner_type,
            status
         FROM owners
         ORDER BY
            CASE
                WHEN LOWER(TRIM(owner_name)) = 'kothattai transports' THEN 0
                WHEN LOWER(COALESCE(owner_type, '')) = 'own' AND COALESCE(status, 'Active') = 'Active' THEN 1
                WHEN COALESCE(status, 'Active') = 'Active' THEN 2
                ELSE 3
            END,
            id ASC
         LIMIT 1`
    );

    return ownerRes.rows[0] || null;
};

const getInvoicePeriodTotals = async (client, fromDate, toDate, productNames = []) => {
    const values = [fromDate, toDate];
    let productFilterClause = '';

    if (Array.isArray(productNames) && productNames.length > 0) {
        const normalizedProductNames = productNames
            .map((name) => String(name || '').trim().toLowerCase())
            .filter((name) => name !== '');
        values.push(normalizedProductNames);
        productFilterClause = ` AND LOWER(TRIM(COALESCE(la.product_name, ''))) = ANY($${values.length}::TEXT[])`;
    }

    const totalsRes = await client.query(
        `SELECT
            COALESCE(NULLIF(TRIM(la.product_name), ''), 'Unknown') AS product_name,
            COALESCE(SUM(lai.quantity), 0)::DECIMAL(12, 3) AS quantity_mt,
            COALESCE(SUM(lai.ifa_amount), 0)::DECIMAL(12, 2) AS amount_freight
         FROM loading_advance_invoices lai
         JOIN loading_advances la ON la.id = lai.loading_advance_id
         WHERE la.invoice_date BETWEEN $1 AND $2${productFilterClause}
         GROUP BY COALESCE(NULLIF(TRIM(la.product_name), ''), 'Unknown')
         ORDER BY product_name ASC`,
        values
    );

    const productBreakup = (totalsRes.rows || []).map((row) => {
        const quantityMt = round3(row.quantity_mt || 0);
        const amountFreight = round2(row.amount_freight || 0);
        return {
            product_name: row.product_name,
            quantity_mt: quantityMt,
            amount_freight: amountFreight,
            // Derived effective freight per MT from transactional totals.
            rcl_freight: quantityMt > 0 ? round2(amountFreight / quantityMt) : 0
        };
    });

    const totals = productBreakup.reduce((acc, row) => ({
        quantity_mt: acc.quantity_mt + row.quantity_mt,
        amount_freight: acc.amount_freight + row.amount_freight
    }), { quantity_mt: 0, amount_freight: 0 });

    return {
        quantity_mt: round3(totals.quantity_mt),
        amount_freight: round2(totals.amount_freight),
        product_breakup: productBreakup
    };
};

const buildInvoiceRow = (row) => {
    if (!row) return row;
    return {
        ...row,
        quantity_mt: toNumber(row.quantity_mt, 0),
        amount_freight: toNumber(row.amount_freight, 0),
        cgst_percent: toNumber(row.cgst_percent, 0),
        cgst_amount: toNumber(row.cgst_amount, 0),
        sgst_percent: toNumber(row.sgst_percent, 0),
        sgst_amount: toNumber(row.sgst_amount, 0),
        total_gst: toNumber(row.total_gst, 0),
        invoice_total: toNumber(row.invoice_total, 0),
        product_breakup: Array.isArray(row.product_breakup)
            ? row.product_breakup.map((item) => ({
                product_name: item.product_name,
                quantity_mt: toNumber(item.quantity_mt, 0),
                amount_freight: toNumber(item.amount_freight, 0),
                rcl_freight: toNumber(item.rcl_freight, 0)
            }))
            : [],
        selected_products: Array.isArray(row.selected_products)
            ? row.selected_products.map((item) => ({
                id: toNumber(item.id, 0),
                product_name: item.product_name
            }))
            : []
    };
};

const getGstInvoiceMeta = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const [companyRes, owner, maxRes, productRes] = await Promise.all([
            client.query(
                `SELECT
                    id,
                    company_name,
                    company_address_1,
                    company_address_2,
                    place,
                    gst_no,
                    contact_no,
                    email_id
                 FROM companies
                 ORDER BY company_name ASC`
            ),
            getOwnerForGstHeader(client),
            client.query('SELECT COALESCE(MAX(CAST(bill_number AS INTEGER)), 0) AS max_bill_number FROM gst_invoices'),
            client.query(
                `SELECT id, product_name
                 FROM products
                 ORDER BY product_name ASC`
            )
        ]);

        const nextBillNumber = getNextBillNumberFromMax(maxRes.rows[0]?.max_bill_number);

        res.status(200).json({
            success: true,
            data: {
                owner,
                companies: companyRes.rows || [],
                products: productRes.rows || [],
                defaults: {
                    cgst_percent: DEFAULT_CGST_PERCENT,
                    sgst_percent: DEFAULT_SGST_PERCENT,
                    next_bill_number: nextBillNumber
                }
            }
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const getGstInvoicePeriodSummary = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const fromDate = normalizeText(req.query?.from_date);
        const toDate = normalizeText(req.query?.to_date);

        if (!fromDate || !isValidDateString(fromDate)) {
            return res.status(400).json({ success: false, message: 'Valid from_date is required' });
        }
        if (!toDate || !isValidDateString(toDate)) {
            return res.status(400).json({ success: false, message: 'Valid to_date is required' });
        }
        if (compareDateOnly(toDate, fromDate) < 0) {
            return res.status(400).json({ success: false, message: 'to_date must be greater than or equal to from_date' });
        }

        const hasProductFilter = req.query && Object.prototype.hasOwnProperty.call(req.query, 'product_ids');
        const selectedProductIds = normalizeProductIdList(req.query?.product_ids);
        if (hasProductFilter && selectedProductIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one valid product' });
        }

        const selectedProducts = await fetchProductsByIds(client, selectedProductIds);
        const selectedProductNames = selectedProducts.map((product) => product.product_name);

        const periodTotals = await getInvoicePeriodTotals(client, fromDate, toDate, selectedProductNames);

        res.status(200).json({
            success: true,
            data: {
                from_date: fromDate,
                to_date: toDate,
                selected_products: selectedProducts,
                ...periodTotals
            }
        });
    } catch (error) {
        if (error.message === 'One or more selected products were not found') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    } finally {
        client.release();
    }
};

const getAllGstInvoices = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                gi.*,
                c.company_name,
                c.company_address_1,
                c.company_address_2,
                c.place AS company_place,
                c.gst_no AS company_gst_no,
                c.contact_no AS company_contact_no,
                c.email_id AS company_email_id
             FROM gst_invoices gi
             LEFT JOIN companies c ON c.id = gi.consignee_company_id
             ORDER BY gi.bill_date DESC, gi.created_at DESC`
        );

        res.status(200).json({ success: true, data: result.rows.map(buildInvoiceRow) });
    } catch (error) {
        next(error);
    }
};

const getGstInvoiceById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid invoice id is required' });
        }

        const result = await pool.query(
            `SELECT
                gi.*,
                c.company_name,
                c.company_address_1,
                c.company_address_2,
                c.place AS company_place,
                c.gst_no AS company_gst_no,
                c.contact_no AS company_contact_no,
                c.email_id AS company_email_id
             FROM gst_invoices gi
             LEFT JOIN companies c ON c.id = gi.consignee_company_id
             WHERE gi.id = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'GST invoice not found' });
        }

        res.status(200).json({ success: true, data: buildInvoiceRow(result.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const createGstInvoice = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;

    try {
        const {
            bill_date,
            consignee_company_id,
            description_of_goods,
            origin_location,
            destination,
            from_date,
            to_date,
            sac_code,
            product_ids,
            created_by
        } = req.body || {};

        const billDate = normalizeText(bill_date);
        const fromDate = normalizeText(from_date);
        const toDate = normalizeText(to_date);
        const description = normalizeText(description_of_goods);
        const origin = normalizeText(origin_location);
        const destinationValue = normalizeText(destination);
        const sacCode = normalizeText(sac_code);
        const consigneeCompanyId = Number(consignee_company_id);

        if (!billDate || !isValidDateString(billDate)) {
            return res.status(400).json({ success: false, message: 'Valid bill_date is required' });
        }
        if (compareDateOnly(billDate, new Date().toISOString().slice(0, 10)) > 0) {
            return res.status(400).json({ success: false, message: 'Bill date cannot be a future date' });
        }
        if (!Number.isInteger(consigneeCompanyId) || consigneeCompanyId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid consignee_company_id is required' });
        }
        if (!description) {
            return res.status(400).json({ success: false, message: 'description_of_goods is required' });
        }
        if (!fromDate || !isValidDateString(fromDate)) {
            return res.status(400).json({ success: false, message: 'Valid from_date is required' });
        }
        if (!toDate || !isValidDateString(toDate)) {
            return res.status(400).json({ success: false, message: 'Valid to_date is required' });
        }
        if (compareDateOnly(toDate, fromDate) < 0) {
            return res.status(400).json({ success: false, message: 'to_date must be greater than or equal to from_date' });
        }
        if (!sacCode) {
            return res.status(400).json({ success: false, message: 'sac_code is required' });
        }

        const hasProductFilter = req.body && Object.prototype.hasOwnProperty.call(req.body, 'product_ids');
        const selectedProductIds = normalizeProductIdList(product_ids);
        if (hasProductFilter && selectedProductIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one valid product' });
        }

        const companyRes = await client.query(
            `SELECT
                id,
                company_name,
                company_address_1,
                company_address_2,
                place,
                gst_no
             FROM companies
             WHERE id = $1`,
            [consigneeCompanyId]
        );

        const company = companyRes.rows[0];
        if (!company) {
            return res.status(400).json({ success: false, message: 'Selected consignee company not found' });
        }

        const selectedProducts = await fetchProductsByIds(client, selectedProductIds);
        const selectedProductNames = selectedProducts.map((product) => product.product_name);

        const periodTotals = await getInvoicePeriodTotals(client, fromDate, toDate, selectedProductNames);

        const amountFreight = round2(periodTotals.amount_freight);
        const quantityMt = round3(periodTotals.quantity_mt);
        const cgstPercent = DEFAULT_CGST_PERCENT;
        const sgstPercent = DEFAULT_SGST_PERCENT;
        const cgstAmount = round2((amountFreight * cgstPercent) / 100);
        const sgstAmount = round2((amountFreight * sgstPercent) / 100);
        const totalGst = round2(cgstAmount + sgstAmount);
        const invoiceTotal = round2(amountFreight + totalGst);
        const filingPeriod = getFilingPeriod(billDate);
        const totalInWords = numberToWordsIndian(invoiceTotal);

        await client.query('BEGIN');
        inTx = true;

        await client.query('LOCK TABLE gst_invoices IN SHARE ROW EXCLUSIVE MODE');
        const maxRes = await client.query('SELECT COALESCE(MAX(CAST(bill_number AS INTEGER)), 0) AS max_bill_number FROM gst_invoices');
        const billNumber = getNextBillNumberFromMax(maxRes.rows[0]?.max_bill_number);

        const insertRes = await client.query(
            `INSERT INTO gst_invoices (
                bill_number,
                bill_date,
                consignee_company_id,
                consignee_name,
                consignee_address,
                consignee_gst_no,
                description_of_goods,
                origin_location,
                destination,
                from_date,
                to_date,
                sac_code,
                quantity_mt,
                amount_freight,
                cgst_percent,
                cgst_amount,
                sgst_percent,
                sgst_amount,
                total_gst,
                invoice_total,
                total_in_words,
                transport_documents,
                reverse_charge_taxable,
                reverse_charge_mechanism,
                filing_status,
                filing_period,
                created_by
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
            )
            RETURNING *`,
            [
                billNumber,
                billDate,
                consigneeCompanyId,
                company.company_name,
                [company.company_address_1, company.company_address_2, company.place].filter(Boolean).join(', '),
                company.gst_no,
                description,
                origin,
                destinationValue,
                fromDate,
                toDate,
                sacCode,
                quantityMt,
                amountFreight,
                cgstPercent,
                cgstAmount,
                sgstPercent,
                sgstAmount,
                totalGst,
                invoiceTotal,
                totalInWords,
                'As per way bill Annexed',
                true,
                false,
                'Not Filed',
                filingPeriod,
                created_by || null
            ]
        );

        await client.query('COMMIT');
        inTx = false;

        const responseRow = buildInvoiceRow(insertRes.rows[0]);
        responseRow.selected_products = selectedProducts;
        responseRow.product_breakup = periodTotals.product_breakup;

        res.status(201).json({ success: true, data: responseRow });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        if (error.message === 'One or more selected products were not found') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    } finally {
        client.release();
    }
};

const updateGstInvoiceFilingStatus = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid invoice id is required' });
        }

        const filingStatus = normalizeText(req.body?.filing_status);
        if (!filingStatus || !['Not Filed', 'Filed'].includes(filingStatus)) {
            return res.status(400).json({ success: false, message: "filing_status must be 'Not Filed' or 'Filed'" });
        }

        const result = await pool.query(
            `UPDATE gst_invoices
             SET filing_status = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, filingStatus]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'GST invoice not found' });
        }

        res.status(200).json({ success: true, data: buildInvoiceRow(result.rows[0]) });
    } catch (error) {
        next(error);
    }
};

const deleteGstInvoice = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid invoice id is required' });
        }

        const result = await pool.query('DELETE FROM gst_invoices WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'GST invoice not found' });
        }

        res.status(200).json({ success: true, message: 'GST invoice deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGstInvoiceMeta,
    getGstInvoicePeriodSummary,
    getAllGstInvoices,
    getGstInvoiceById,
    createGstInvoice,
    updateGstInvoiceFilingStatus,
    deleteGstInvoice
};
