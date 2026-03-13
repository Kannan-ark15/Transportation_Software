const pool = require('../config/database');

const PAYMENT_CATEGORIES = ['Transactions', 'Advances and Loans', 'Masters'];
const REFERENCE_CATEGORIES = ['Cash', 'Bank'];
const REFERENCE_MODULES_BY_CATEGORY = {
    'Transactions': ['Driver Salary Payable', 'Dedicated Owner Payable'],
    'Advances and Loans': ['Due Settlement'],
    'Masters': ['Insurance']
};

const toNumber = (value, fallback = NaN) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
};

const getAllowedModules = (category) => REFERENCE_MODULES_BY_CATEGORY[category] || [];

const fetchVehicle = async (client, vehicleId) => {
    const result = await client.query(
        'SELECT id, vehicle_no FROM vehicles WHERE id = $1',
        [vehicleId]
    );
    return result.rows[0] || null;
};

const fetchReferenceInfo = async (client, referenceModule, referenceRecordId) => {
    switch (referenceModule) {
        case 'Driver Salary Payable': {
            const result = await client.query(
                `SELECT
                    s.id,
                    s.driver_name,
                    s.driver_salary_payable,
                    COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
                 FROM own_vehicle_settlements s
                 LEFT JOIN own_vehicle_settlement_vouchers sv ON sv.settlement_id = s.id
                 WHERE s.id = $1
                 GROUP BY s.id`,
                [referenceRecordId]
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                amount: toNumber(row.driver_salary_payable, 0),
                label: row.driver_name || null,
                vehicle_numbers: row.vehicle_numbers || null
            };
        }
        case 'Dedicated Owner Payable': {
            const result = await client.query(
                `SELECT
                    s.id,
                    s.owner_name,
                    s.settlement_balance,
                    COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
                 FROM dedicated_market_settlements s
                 LEFT JOIN dedicated_market_settlement_vouchers sv ON sv.settlement_id = s.id
                 WHERE s.id = $1
                 GROUP BY s.id`,
                [referenceRecordId]
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                amount: toNumber(row.settlement_balance, 0),
                label: row.owner_name || null,
                vehicle_numbers: row.vehicle_numbers || null
            };
        }
        case 'Due Settlement': {
            const result = await client.query(
                `SELECT
                    lrt.id,
                    lrt.due_amount,
                    lrt.due_date,
                    lrt.installment_number,
                    lrt.due_settled,
                    lm.id AS loan_master_id,
                    lm.vehicle_id,
                    COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number
                 FROM loan_repayment_trackings lrt
                 JOIN loan_masters lm ON lm.id = lrt.loan_master_id
                 LEFT JOIN vehicles v ON v.id = lm.vehicle_id
                 WHERE lrt.id = $1`,
                [referenceRecordId]
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                amount: toNumber(row.due_amount, 0),
                label: row.vehicle_number || null,
                due_date: row.due_date || null,
                installment_number: row.installment_number || null,
                vehicle_id: row.vehicle_id || null,
                due_settled: row.due_settled === true
            };
        }
        case 'Insurance': {
            const result = await client.query(
                `SELECT id, vehicle_no, insurance_no, insurance_amount
                 FROM vehicles
                 WHERE id = $1`,
                [referenceRecordId]
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                amount: toNumber(row.insurance_amount, 0),
                label: row.vehicle_no || null,
                insurance_no: row.insurance_no || null,
                vehicle_id: row.id
            };
        }
        default:
            return null;
    }
};

const buildPaymentRow = (row) => {
    if (!row) return row;
    const amountPaid = toNumber(row.amount_paid, 0);
    const referenceAmount = row.reference_amount === null || row.reference_amount === undefined
        ? null
        : toNumber(row.reference_amount, 0);

    let settlementStatus = 'Unknown';
    if (referenceAmount !== null) {
        settlementStatus = amountPaid >= referenceAmount ? 'Settled' : 'Pending';
    }

    let referenceLabel = '';
    if (row.reference_module === 'Driver Salary Payable') {
        const driverName = row.reference_party || '';
        const vehicles = row.reference_vehicle_numbers ? ` | Vehicles: ${row.reference_vehicle_numbers}` : '';
        referenceLabel = driverName ? `Driver ${driverName}${vehicles}` : vehicles ? `Driver${vehicles}` : '';
    } else if (row.reference_module === 'Dedicated Owner Payable') {
        const ownerName = row.reference_party || '';
        const vehicles = row.reference_vehicle_numbers ? ` | Vehicles: ${row.reference_vehicle_numbers}` : '';
        referenceLabel = ownerName ? `Owner ${ownerName}${vehicles}` : vehicles ? `Owner${vehicles}` : '';
    } else if (row.reference_module === 'Due Settlement') {
        const vehicleNumber = row.reference_party || '';
        const installment = row.installment_number ? ` | Inst ${row.installment_number}` : '';
        const dueDate = row.due_date ? ` | Due ${row.due_date}` : '';
        referenceLabel = vehicleNumber ? `Vehicle ${vehicleNumber}${installment}${dueDate}` : `${installment}${dueDate}`.trim();
    } else if (row.reference_module === 'Insurance') {
        const vehicleNumber = row.reference_party || '';
        const policyNo = row.insurance_no || '';
        referenceLabel = vehicleNumber
            ? `Vehicle ${vehicleNumber}${policyNo ? ` | Policy ${policyNo}` : ''}`
            : (policyNo ? `Policy ${policyNo}` : '');
    }

    return {
        ...row,
        vehicle_number: row.vehicle_number_display || row.vehicle_number || null,
        reference_amount: referenceAmount,
        settlement_status: settlementStatus,
        reference_label: referenceLabel
    };
};

const PAYMENT_SELECT = `
    SELECT
        p.*,
        COALESCE(v.vehicle_no, p.vehicle_number) AS vehicle_number_display,
        CASE
            WHEN p.reference_module = 'Driver Salary Payable' THEN ovs.driver_salary_payable
            WHEN p.reference_module = 'Dedicated Owner Payable' THEN dms.settlement_balance
            WHEN p.reference_module = 'Due Settlement' THEN lrt.due_amount
            WHEN p.reference_module = 'Insurance' THEN veh.insurance_amount
            ELSE NULL
        END AS reference_amount,
        CASE
            WHEN p.reference_module = 'Driver Salary Payable' THEN ovs.driver_name
            WHEN p.reference_module = 'Dedicated Owner Payable' THEN dms.owner_name
            WHEN p.reference_module = 'Due Settlement' THEN COALESCE(v2.vehicle_no, lm.vehicle_number)
            WHEN p.reference_module = 'Insurance' THEN veh.vehicle_no
            ELSE NULL
        END AS reference_party,
        CASE
            WHEN p.reference_module = 'Driver Salary Payable' THEN ovs.vehicle_numbers
            WHEN p.reference_module = 'Dedicated Owner Payable' THEN dms.vehicle_numbers
            ELSE NULL
        END AS reference_vehicle_numbers,
        CASE
            WHEN p.reference_module = 'Due Settlement' THEN lrt.installment_number
            ELSE NULL
        END AS installment_number,
        CASE
            WHEN p.reference_module = 'Due Settlement' THEN lrt.due_date
            ELSE NULL
        END AS due_date,
        CASE
            WHEN p.reference_module = 'Insurance' THEN veh.insurance_no
            ELSE NULL
        END AS insurance_no
    FROM cashbook_payments p
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    LEFT JOIN (
        SELECT
            s.id,
            s.driver_name,
            s.driver_salary_payable,
            COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
        FROM own_vehicle_settlements s
        LEFT JOIN own_vehicle_settlement_vouchers sv ON sv.settlement_id = s.id
        GROUP BY s.id
    ) ovs ON p.reference_module = 'Driver Salary Payable' AND p.reference_record_id = ovs.id
    LEFT JOIN (
        SELECT
            s.id,
            s.owner_name,
            s.settlement_balance,
            COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
        FROM dedicated_market_settlements s
        LEFT JOIN dedicated_market_settlement_vouchers sv ON sv.settlement_id = s.id
        GROUP BY s.id
    ) dms ON p.reference_module = 'Dedicated Owner Payable' AND p.reference_record_id = dms.id
    LEFT JOIN loan_repayment_trackings lrt ON p.reference_module = 'Due Settlement' AND p.reference_record_id = lrt.id
    LEFT JOIN loan_masters lm ON lrt.loan_master_id = lm.id
    LEFT JOIN vehicles v2 ON lm.vehicle_id = v2.id
    LEFT JOIN vehicles veh ON p.reference_module = 'Insurance' AND p.reference_record_id = veh.id
`;

const fetchPaymentById = async (client, id) => {
    const result = await client.query(`${PAYMENT_SELECT} WHERE p.id = $1`, [id]);
    if (!result.rows.length) return null;
    return buildPaymentRow(result.rows[0]);
};

const getCashbookMeta = async (req, res, next) => {
    try {
        const [vehiclesRes, driverPayableRes, ownerPayableRes, dueSettlementRes, insuranceRes] = await Promise.all([
            pool.query('SELECT id, vehicle_no FROM vehicles ORDER BY vehicle_no ASC'),
            pool.query(
                `SELECT
                    s.id,
                    s.driver_name,
                    s.driver_salary_payable,
                    s.created_at,
                    COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
                 FROM own_vehicle_settlements s
                 LEFT JOIN own_vehicle_settlement_vouchers sv ON sv.settlement_id = s.id
                 GROUP BY s.id
                 ORDER BY s.created_at DESC`
            ),
            pool.query(
                `SELECT
                    s.id,
                    s.owner_name,
                    s.settlement_balance,
                    s.created_at,
                    COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers
                 FROM dedicated_market_settlements s
                 LEFT JOIN dedicated_market_settlement_vouchers sv ON sv.settlement_id = s.id
                 GROUP BY s.id
                 ORDER BY s.created_at DESC`
            ),
            pool.query(
                `SELECT
                    lrt.id,
                    lrt.loan_master_id,
                    lrt.installment_number,
                    lrt.due_date,
                    lrt.due_amount,
                    COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number,
                    lm.vehicle_id
                 FROM loan_repayment_trackings lrt
                 JOIN loan_masters lm ON lm.id = lrt.loan_master_id
                 LEFT JOIN vehicles v ON v.id = lm.vehicle_id
                 WHERE lrt.due_settled = FALSE
                 ORDER BY lrt.due_date ASC, lrt.installment_number ASC`
            ),
            pool.query(
                `SELECT id, vehicle_no, insurance_no, insurance_amount
                 FROM vehicles
                 WHERE insurance_amount IS NOT NULL
                 ORDER BY vehicle_no ASC`
            )
        ]);

        res.status(200).json({
            success: true,
            data: {
                vehicles: vehiclesRes.rows || [],
                driver_salary_payables: driverPayableRes.rows || [],
                dedicated_owner_payables: ownerPayableRes.rows || [],
                due_settlements: dueSettlementRes.rows || [],
                insurance_records: insuranceRes.rows || []
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllPayments = async (req, res, next) => {
    try {
        const result = await pool.query(`${PAYMENT_SELECT} ORDER BY p.payment_date DESC, p.created_at DESC`);
        res.status(200).json({ success: true, data: result.rows.map(buildPaymentRow) });
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid payment id is required' });
        }
        const row = await fetchPaymentById(pool, id);
        if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
        res.status(200).json({ success: true, data: row });
    } catch (error) {
        next(error);
    }
};

const createPayment = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const {
            payment_date,
            vehicle_id,
            payment_category,
            reference_category,
            reference_module,
            reference_record_id,
            amount_paid,
            remarks,
            created_by
        } = req.body || {};

        const vehicleId = Number(vehicle_id);
        if (!payment_date) {
            return res.status(400).json({ success: false, message: 'payment_date is required' });
        }
        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid vehicle_id is required' });
        }
        if (!PAYMENT_CATEGORIES.includes(payment_category)) {
            return res.status(400).json({ success: false, message: 'Invalid payment_category' });
        }
        if (!REFERENCE_CATEGORIES.includes(reference_category)) {
            return res.status(400).json({ success: false, message: 'Invalid reference_category' });
        }
        if (!reference_module || !getAllowedModules(payment_category).includes(reference_module)) {
            return res.status(400).json({ success: false, message: 'Invalid reference_module for the selected category' });
        }

        const referenceId = Number(reference_record_id);
        if (!Number.isInteger(referenceId) || referenceId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid reference_record_id is required' });
        }

        const amountPaid = toNumber(amount_paid, NaN);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            return res.status(400).json({ success: false, message: 'amount_paid must be greater than 0' });
        }

        const vehicle = await fetchVehicle(client, vehicleId);
        if (!vehicle) {
            return res.status(400).json({ success: false, message: 'Vehicle not found' });
        }

        const existing = await client.query(
            'SELECT id FROM cashbook_payments WHERE reference_module = $1 AND reference_record_id = $2',
            [reference_module, referenceId]
        );
        if (existing.rows.length) {
            return res.status(400).json({ success: false, message: 'A payment already exists for the selected reference record' });
        }

        const refInfo = await fetchReferenceInfo(client, reference_module, referenceId);
        if (!refInfo) {
            return res.status(400).json({ success: false, message: 'Reference record not found' });
        }
        if (reference_module === 'Due Settlement' && refInfo.due_settled) {
            return res.status(400).json({ success: false, message: 'Selected due settlement is already settled' });
        }
        if (refInfo.vehicle_id && Number(refInfo.vehicle_id) !== vehicleId) {
            return res.status(400).json({ success: false, message: 'Selected vehicle does not match the reference record' });
        }

        const referenceAmount = toNumber(refInfo.amount, 0);
        if (referenceAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Reference amount must be greater than 0' });
        }
        if (amountPaid > referenceAmount) {
            return res.status(400).json({ success: false, message: 'Amount paid cannot exceed the reference amount' });
        }

        await client.query('BEGIN');
        inTx = true;

        const insertRes = await client.query(
            `INSERT INTO cashbook_payments
                (payment_date, vehicle_id, vehicle_number, payment_category, reference_category,
                 reference_module, reference_record_id, amount_paid, remarks, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING id`,
            [
                payment_date,
                vehicleId,
                vehicle.vehicle_no,
                payment_category,
                reference_category,
                reference_module,
                referenceId,
                Number(amountPaid.toFixed(2)),
                normalizeText(remarks),
                created_by || null
            ]
        );

        const newId = insertRes.rows[0]?.id;

        if (reference_module === 'Due Settlement') {
            const shouldSettle = amountPaid >= referenceAmount;
            await client.query(
                `UPDATE loan_repayment_trackings
                 SET due_settled = $2,
                     settled_at = CASE WHEN $2 THEN COALESCE(settled_at, CURRENT_TIMESTAMP) ELSE NULL END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [referenceId, shouldSettle]
            );
        }

        await client.query('COMMIT');
        inTx = false;

        const row = await fetchPaymentById(client, newId);
        res.status(201).json({ success: true, data: row });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

const updatePayment = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid payment id is required' });
        }

        const existingPayment = await fetchPaymentById(client, id);
        if (!existingPayment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        const {
            payment_date,
            vehicle_id,
            payment_category,
            reference_category,
            reference_module,
            reference_record_id,
            amount_paid,
            remarks
        } = req.body || {};

        const vehicleId = Number(vehicle_id);
        if (!payment_date) {
            return res.status(400).json({ success: false, message: 'payment_date is required' });
        }
        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid vehicle_id is required' });
        }
        if (!PAYMENT_CATEGORIES.includes(payment_category)) {
            return res.status(400).json({ success: false, message: 'Invalid payment_category' });
        }
        if (!REFERENCE_CATEGORIES.includes(reference_category)) {
            return res.status(400).json({ success: false, message: 'Invalid reference_category' });
        }
        if (!reference_module || !getAllowedModules(payment_category).includes(reference_module)) {
            return res.status(400).json({ success: false, message: 'Invalid reference_module for the selected category' });
        }

        const referenceId = Number(reference_record_id);
        if (!Number.isInteger(referenceId) || referenceId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid reference_record_id is required' });
        }

        const amountPaid = toNumber(amount_paid, NaN);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            return res.status(400).json({ success: false, message: 'amount_paid must be greater than 0' });
        }

        const vehicle = await fetchVehicle(client, vehicleId);
        if (!vehicle) {
            return res.status(400).json({ success: false, message: 'Vehicle not found' });
        }

        const duplicate = await client.query(
            'SELECT id FROM cashbook_payments WHERE reference_module = $1 AND reference_record_id = $2 AND id <> $3',
            [reference_module, referenceId, id]
        );
        if (duplicate.rows.length) {
            return res.status(400).json({ success: false, message: 'Another payment already exists for the selected reference record' });
        }

        const refInfo = await fetchReferenceInfo(client, reference_module, referenceId);
        if (!refInfo) {
            return res.status(400).json({ success: false, message: 'Reference record not found' });
        }
        if (reference_module === 'Due Settlement' && refInfo.due_settled && existingPayment.reference_record_id !== referenceId) {
            return res.status(400).json({ success: false, message: 'Selected due settlement is already settled' });
        }
        if (refInfo.vehicle_id && Number(refInfo.vehicle_id) !== vehicleId) {
            return res.status(400).json({ success: false, message: 'Selected vehicle does not match the reference record' });
        }

        const referenceAmount = toNumber(refInfo.amount, 0);
        if (referenceAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Reference amount must be greater than 0' });
        }
        if (amountPaid > referenceAmount) {
            return res.status(400).json({ success: false, message: 'Amount paid cannot exceed the reference amount' });
        }

        await client.query('BEGIN');
        inTx = true;

        if (existingPayment.reference_module === 'Due Settlement') {
            await client.query(
                `UPDATE loan_repayment_trackings
                 SET due_settled = FALSE,
                     settled_at = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [existingPayment.reference_record_id]
            );
        }

        await client.query(
            `UPDATE cashbook_payments
             SET payment_date = $2,
                 vehicle_id = $3,
                 vehicle_number = $4,
                 payment_category = $5,
                 reference_category = $6,
                 reference_module = $7,
                 reference_record_id = $8,
                 amount_paid = $9,
                 remarks = $10
             WHERE id = $1`,
            [
                id,
                payment_date,
                vehicleId,
                vehicle.vehicle_no,
                payment_category,
                reference_category,
                reference_module,
                referenceId,
                Number(amountPaid.toFixed(2)),
                normalizeText(remarks)
            ]
        );

        if (reference_module === 'Due Settlement') {
            const shouldSettle = amountPaid >= referenceAmount;
            await client.query(
                `UPDATE loan_repayment_trackings
                 SET due_settled = $2,
                     settled_at = CASE WHEN $2 THEN COALESCE(settled_at, CURRENT_TIMESTAMP) ELSE NULL END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [referenceId, shouldSettle]
            );
        }

        await client.query('COMMIT');
        inTx = false;

        const row = await fetchPaymentById(client, id);
        res.status(200).json({ success: true, data: row });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

const deletePayment = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid payment id is required' });
        }

        const existingPayment = await fetchPaymentById(client, id);
        if (!existingPayment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        await client.query('BEGIN');
        inTx = true;

        if (existingPayment.reference_module === 'Due Settlement') {
            await client.query(
                `UPDATE loan_repayment_trackings
                 SET due_settled = FALSE,
                     settled_at = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [existingPayment.reference_record_id]
            );
        }

        await client.query('DELETE FROM cashbook_payments WHERE id = $1', [id]);

        await client.query('COMMIT');
        inTx = false;

        res.status(200).json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    getCashbookMeta,
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
