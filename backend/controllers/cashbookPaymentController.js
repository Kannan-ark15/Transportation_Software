const pool = require('../config/database');

const PAYMENT_CATEGORIES = ['Transactions', 'Advances and Loans', 'Masters'];
const REFERENCE_CATEGORIES = ['Cash', 'Bank'];
const READY_STATUS = 'Ready for Settlement';
const SETTLEMENT_REFERENCE_TYPE = 'Settlement';
const VEHICLE_GROUP_REFERENCE_TYPE = 'VehicleVoucherGroup';
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

const calculateDedicatedVoucherPayable = (sumIfas, commissionPercent) => {
    const normalizedSumIfas = toNumber(sumIfas, 0);
    const normalizedCommissionPercent = toNumber(commissionPercent, 6);
    return Number((normalizedSumIfas - ((normalizedSumIfas * normalizedCommissionPercent) / 100)).toFixed(2));
};

const fetchDedicatedVehicleGroupInfo = async (client, anchorLoadingAdvanceId, excludePaymentId = null) => {
    const anchorRes = await client.query(
        `SELECT id, owner_id, owner_name, owner_type, vehicle_registration_number
         FROM loading_advances
         WHERE id = $1`,
        [anchorLoadingAdvanceId]
    );
    const anchor = anchorRes.rows[0];
    if (!anchor) return null;

    const ownerRes = await client.query(
        `SELECT id, owner_name, owner_type
         FROM owners
         WHERE (id = $1 OR ($1::INT IS NULL AND owner_name = $2 AND owner_type = $3))
           AND owner_type IN ('Dedicated', 'Market')`,
        [anchor.owner_id, anchor.owner_name, anchor.owner_type]
    );
    const owner = ownerRes.rows[0] || {
        id: anchor.owner_id,
        owner_name: anchor.owner_name,
        owner_type: anchor.owner_type
    };
    if (!owner.id || !['Dedicated', 'Market'].includes(owner.owner_type)) return null;

    const result = await client.query(
        `SELECT
            la.id AS loading_advance_id,
            a.id AS acknowledgement_id,
            a.voucher_number,
            la.vehicle_registration_number AS vehicle_number,
            v.id AS vehicle_id,
            COALESCE(
                la.sum_ifas,
                (SELECT SUM(lai.ifa_amount)
                 FROM loading_advance_invoices lai
                 WHERE lai.loading_advance_id = la.id),
                0
            )::DECIMAL(12,2) AS sum_ifas,
            COALESCE(la.commission_pct, 6)::DECIMAL(12,4) AS commission_pct
         FROM acknowledgements a
         JOIN loading_advances la ON la.id = a.loading_advance_id
         JOIN owners o ON (
             o.id = la.owner_id
             OR (
                 la.owner_id IS NULL
                 AND o.owner_name = la.owner_name
                 AND o.owner_type = la.owner_type
             )
         )
         JOIN vehicles v ON v.vehicle_no = la.vehicle_registration_number
         WHERE a.voucher_status = $1
           AND o.id = $2
           AND la.vehicle_registration_number = $3
           AND NOT EXISTS (
               SELECT 1
               FROM dedicated_market_settlement_vouchers dmsv
               WHERE dmsv.loading_advance_id = la.id
           )
           AND NOT EXISTS (
               SELECT 1
               FROM cashbook_payments cp
               WHERE cp.reference_module = 'Dedicated Owner Payable'
                 AND COALESCE(cp.reference_record_type, $4) = $4
                 AND ($5::INT IS NULL OR cp.id <> $5)
                 AND la.id = ANY(COALESCE(cp.reference_loading_advance_ids, ARRAY[]::INTEGER[]))
           )
         ORDER BY la.id ASC`,
        [READY_STATUS, owner.id, anchor.vehicle_registration_number, VEHICLE_GROUP_REFERENCE_TYPE, excludePaymentId]
    );

    if (result.rows.length === 0) return null;

    const amount = Number(result.rows.reduce(
        (sum, row) => sum + calculateDedicatedVoucherPayable(row.sum_ifas, row.commission_pct),
        0
    ).toFixed(2));
    const vehicleIds = [...new Set(result.rows.map(row => Number(row.vehicle_id)).filter(Number.isInteger))];

    return {
        amount,
        label: owner.owner_name || anchor.owner_name || null,
        vehicle_id: vehicleIds.length === 1 ? vehicleIds[0] : null,
        vehicle_ids: vehicleIds,
        vehicle_numbers: anchor.vehicle_registration_number || null,
        loading_advance_ids: result.rows.map(row => Number(row.loading_advance_id)),
        voucher_numbers: result.rows.map(row => row.voucher_number).filter(Boolean).join(', '),
        settled: false
    };
};

const fetchReferenceInfo = async (
    client,
    referenceModule,
    referenceRecordId,
    referenceRecordType = SETTLEMENT_REFERENCE_TYPE,
    excludePaymentId = null
) => {
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
            if (referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE) {
                return fetchDedicatedVehicleGroupInfo(client, referenceRecordId, excludePaymentId);
            }

            const result = await client.query(
                `SELECT
                    s.id,
                    s.owner_name,
                    s.settled,
                    COALESCE(
                        SUM(sv.final_balance) FILTER (WHERE a.voucher_status = $2),
                        s.settlement_balance,
                        0
                    )::DECIMAL(12,2) AS settlement_balance,
                    COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers,
                    COALESCE(array_agg(DISTINCT v.id) FILTER (WHERE v.id IS NOT NULL), ARRAY[]::INTEGER[]) AS vehicle_ids
                 FROM dedicated_market_settlements s
                 LEFT JOIN dedicated_market_settlement_vouchers sv ON sv.settlement_id = s.id
                 LEFT JOIN acknowledgements a ON a.id = sv.acknowledgement_id
                 LEFT JOIN vehicles v ON v.vehicle_no = sv.vehicle_number
                 WHERE s.id = $1
                 GROUP BY s.id`,
                [referenceRecordId, READY_STATUS]
            );
            const row = result.rows[0];
            if (!row) return null;
            return {
                amount: toNumber(row.settlement_balance, 0),
                label: row.owner_name || null,
                vehicle_numbers: row.vehicle_numbers || null,
                vehicle_id: row.vehicle_ids?.length === 1 ? row.vehicle_ids[0] : null,
                vehicle_ids: row.vehicle_ids || [],
                settled: row.settled === true
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
            WHEN p.reference_module = 'Dedicated Owner Payable'
                AND COALESCE(p.reference_record_type, 'Settlement') = 'VehicleVoucherGroup'
                THEN p.reference_amount_snapshot
            WHEN p.reference_module = 'Driver Salary Payable' THEN ovs.driver_salary_payable
            WHEN p.reference_module = 'Dedicated Owner Payable' THEN dms.settlement_balance
            WHEN p.reference_module = 'Due Settlement' THEN lrt.due_amount
            WHEN p.reference_module = 'Insurance' THEN veh.insurance_amount
            ELSE NULL
        END AS reference_amount,
        CASE
            WHEN p.reference_module = 'Dedicated Owner Payable'
                AND COALESCE(p.reference_record_type, 'Settlement') = 'VehicleVoucherGroup'
                THEN dmp.owner_name
            WHEN p.reference_module = 'Driver Salary Payable' THEN ovs.driver_name
            WHEN p.reference_module = 'Dedicated Owner Payable' THEN dms.owner_name
            WHEN p.reference_module = 'Due Settlement' THEN COALESCE(v2.vehicle_no, lm.vehicle_number)
            WHEN p.reference_module = 'Insurance' THEN veh.vehicle_no
            ELSE NULL
        END AS reference_party,
        CASE
            WHEN p.reference_module = 'Dedicated Owner Payable'
                AND COALESCE(p.reference_record_type, 'Settlement') = 'VehicleVoucherGroup'
                THEN dmp.vehicle_numbers
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
    LEFT JOIN (
        SELECT
            cp.id AS payment_id,
            MAX(la.owner_name) AS owner_name,
            COALESCE(string_agg(DISTINCT la.vehicle_registration_number, ', ' ORDER BY la.vehicle_registration_number), '') AS vehicle_numbers
        FROM cashbook_payments cp
        JOIN loading_advances la
            ON la.id = ANY(COALESCE(cp.reference_loading_advance_ids, ARRAY[]::INTEGER[]))
        WHERE cp.reference_module = 'Dedicated Owner Payable'
          AND COALESCE(cp.reference_record_type, 'Settlement') = 'VehicleVoucherGroup'
        GROUP BY cp.id
    ) dmp ON p.id = dmp.payment_id
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
            pool.query(
                `SELECT
                    id,
                    vehicle_no,
                    own_dedicated
                 FROM vehicles
                 ORDER BY vehicle_no ASC`
            ),
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
                `WITH remaining_vouchers AS (
                    SELECT
                        la.id AS loading_advance_id,
                        la.voucher_number,
                        o.id AS owner_id,
                        o.owner_name,
                        o.owner_type,
                        la.vehicle_registration_number AS vehicle_number,
                        v.id AS vehicle_id,
                        COALESCE(
                            la.sum_ifas,
                            (SELECT SUM(lai.ifa_amount)
                             FROM loading_advance_invoices lai
                             WHERE lai.loading_advance_id = la.id),
                            0
                        )::DECIMAL(12,2) AS sum_ifas,
                        COALESCE(la.commission_pct, 6)::DECIMAL(12,4) AS commission_pct,
                        la.created_at
                    FROM acknowledgements a
                    JOIN loading_advances la ON la.id = a.loading_advance_id
                    JOIN owners o ON (
                        o.id = la.owner_id
                        OR (
                            la.owner_id IS NULL
                            AND o.owner_name = la.owner_name
                            AND o.owner_type = la.owner_type
                        )
                    )
                    JOIN vehicles v ON v.vehicle_no = la.vehicle_registration_number
                    WHERE a.voucher_status = $1
                      AND LOWER(TRIM(COALESCE(la.owner_type, ''))) IN ('dedicated', 'market')
                      AND o.status = 'Active'
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dedicated_market_settlement_vouchers dmsv
                          WHERE dmsv.loading_advance_id = la.id
                      )
                      AND NOT EXISTS (
                          SELECT 1
                          FROM cashbook_payments cp
                          WHERE cp.reference_module = 'Dedicated Owner Payable'
                            AND COALESCE(cp.reference_record_type, 'Settlement') = $2
                            AND la.id = ANY(COALESCE(cp.reference_loading_advance_ids, ARRAY[]::INTEGER[]))
                      )
                )
                SELECT
                    MIN(rv.loading_advance_id) AS id,
                    rv.owner_id,
                    rv.owner_name,
                    rv.owner_type,
                    rv.vehicle_id,
                    rv.vehicle_number,
                    SUM(rv.sum_ifas)::DECIMAL(12,2) AS sum_ifas,
                    SUM(ROUND(rv.sum_ifas - ((rv.sum_ifas * rv.commission_pct) / 100), 2))::DECIMAL(12,2) AS settlement_balance,
                    MAX(rv.created_at) AS created_at,
                    FALSE AS settled,
                    ARRAY[rv.vehicle_id]::INTEGER[] AS vehicle_ids,
                    COALESCE(string_agg(rv.voucher_number, ', ' ORDER BY rv.voucher_number), '') AS voucher_numbers,
                    COALESCE(string_agg(rv.vehicle_number, ', ' ORDER BY rv.vehicle_number), '') AS vehicle_numbers,
                    array_agg(rv.loading_advance_id ORDER BY rv.loading_advance_id) AS reference_loading_advance_ids,
                    $2::VARCHAR AS reference_record_type
                FROM remaining_vouchers rv
                GROUP BY rv.owner_id, rv.owner_name, rv.owner_type, rv.vehicle_id, rv.vehicle_number
                HAVING SUM(ROUND(rv.sum_ifas - ((rv.sum_ifas * rv.commission_pct) / 100), 2)) > 0
                ORDER BY MAX(rv.created_at) DESC, rv.vehicle_number ASC`,
                [READY_STATUS, VEHICLE_GROUP_REFERENCE_TYPE]
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
            reference_record_type,
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

        const referenceRecordType = reference_record_type || SETTLEMENT_REFERENCE_TYPE;
        if (![SETTLEMENT_REFERENCE_TYPE, VEHICLE_GROUP_REFERENCE_TYPE].includes(referenceRecordType)
            || (referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE && reference_module !== 'Dedicated Owner Payable')) {
            return res.status(400).json({ success: false, message: 'Invalid reference_record_type' });
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
            `SELECT id
             FROM cashbook_payments
             WHERE reference_module = $1
               AND COALESCE(reference_record_type, $2) = $2
               AND reference_record_id = $3`,
            [reference_module, referenceRecordType, referenceId]
        );
        if (existing.rows.length) {
            return res.status(400).json({ success: false, message: 'A payment already exists for the selected reference record' });
        }

        const refInfo = await fetchReferenceInfo(client, reference_module, referenceId, referenceRecordType);
        if (!refInfo) {
            return res.status(400).json({ success: false, message: 'Reference record not found' });
        }
        if (reference_module === 'Due Settlement' && refInfo.due_settled) {
            return res.status(400).json({ success: false, message: 'Selected due settlement is already settled' });
        }
        if (reference_module === 'Dedicated Owner Payable'
            && referenceRecordType === SETTLEMENT_REFERENCE_TYPE
            && refInfo.settled) {
            return res.status(400).json({ success: false, message: 'Selected dedicated settlement is already settled' });
        }
        if (reference_module === 'Dedicated Owner Payable'
            && (!refInfo.vehicle_ids?.length || !refInfo.vehicle_ids.some(id => Number(id) === vehicleId))) {
            return res.status(400).json({ success: false, message: 'Selected vehicle does not match the dedicated settlement' });
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
        if (referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE
            && Math.round(amountPaid * 100) !== Math.round(referenceAmount * 100)) {
            return res.status(400).json({ success: false, message: 'The remaining dedicated owner balance must be paid in full' });
        }

        await client.query('BEGIN');
        inTx = true;

        const insertRes = await client.query(
            `INSERT INTO cashbook_payments
                (payment_date, vehicle_id, vehicle_number, payment_category, reference_category,
                 reference_module, reference_record_type, reference_record_id,
                 reference_loading_advance_ids, reference_amount_snapshot, amount_paid, remarks, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id`,
            [
                payment_date,
                vehicleId,
                vehicle.vehicle_no,
                payment_category,
                reference_category,
                reference_module,
                referenceRecordType,
                referenceId,
                referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE ? refInfo.loading_advance_ids : null,
                referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE ? referenceAmount : null,
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

        if (reference_module === 'Dedicated Owner Payable'
            && referenceRecordType === SETTLEMENT_REFERENCE_TYPE) {
            const shouldSettle = amountPaid >= referenceAmount;
            await client.query(
                `UPDATE dedicated_market_settlements
                 SET settled = $2,
                     settled_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
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
            reference_record_type,
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

        const referenceRecordType = reference_record_type || SETTLEMENT_REFERENCE_TYPE;
        if (![SETTLEMENT_REFERENCE_TYPE, VEHICLE_GROUP_REFERENCE_TYPE].includes(referenceRecordType)
            || (referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE && reference_module !== 'Dedicated Owner Payable')) {
            return res.status(400).json({ success: false, message: 'Invalid reference_record_type' });
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
            `SELECT id
             FROM cashbook_payments
             WHERE reference_module = $1
               AND COALESCE(reference_record_type, $2) = $2
               AND reference_record_id = $3
               AND id <> $4`,
            [reference_module, referenceRecordType, referenceId, id]
        );
        if (duplicate.rows.length) {
            return res.status(400).json({ success: false, message: 'Another payment already exists for the selected reference record' });
        }

        const refInfo = await fetchReferenceInfo(
            client,
            reference_module,
            referenceId,
            referenceRecordType,
            referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE ? id : null
        );
        if (!refInfo) {
            return res.status(400).json({ success: false, message: 'Reference record not found' });
        }
        if (reference_module === 'Due Settlement' && refInfo.due_settled && existingPayment.reference_record_id !== referenceId) {
            return res.status(400).json({ success: false, message: 'Selected due settlement is already settled' });
        }
        if (reference_module === 'Dedicated Owner Payable'
            && referenceRecordType === SETTLEMENT_REFERENCE_TYPE
            && refInfo.settled
            && existingPayment.reference_record_id !== referenceId) {
            return res.status(400).json({ success: false, message: 'Selected dedicated settlement is already settled' });
        }
        if (reference_module === 'Dedicated Owner Payable'
            && (!refInfo.vehicle_ids?.length || !refInfo.vehicle_ids.some(vehicleReferenceId => Number(vehicleReferenceId) === vehicleId))) {
            return res.status(400).json({ success: false, message: 'Selected vehicle does not match the dedicated settlement' });
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
        if (referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE
            && Math.round(amountPaid * 100) !== Math.round(referenceAmount * 100)) {
            return res.status(400).json({ success: false, message: 'The remaining dedicated owner balance must be paid in full' });
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

        if (existingPayment.reference_module === 'Dedicated Owner Payable'
            && (existingPayment.reference_record_type || SETTLEMENT_REFERENCE_TYPE) === SETTLEMENT_REFERENCE_TYPE
            && (existingPayment.reference_record_id !== referenceId
                || reference_module !== 'Dedicated Owner Payable'
                || referenceRecordType !== SETTLEMENT_REFERENCE_TYPE)) {
            await client.query(
                `UPDATE dedicated_market_settlements
                 SET settled = FALSE,
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
                 reference_record_type = $8,
                 reference_record_id = $9,
                 reference_loading_advance_ids = $10,
                 reference_amount_snapshot = $11,
                 amount_paid = $12,
                 remarks = $13
             WHERE id = $1`,
            [
                id,
                payment_date,
                vehicleId,
                vehicle.vehicle_no,
                payment_category,
                reference_category,
                reference_module,
                referenceRecordType,
                referenceId,
                referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE ? refInfo.loading_advance_ids : null,
                referenceRecordType === VEHICLE_GROUP_REFERENCE_TYPE ? referenceAmount : null,
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

        if (reference_module === 'Dedicated Owner Payable'
            && referenceRecordType === SETTLEMENT_REFERENCE_TYPE) {
            const shouldSettle = amountPaid >= referenceAmount;
            await client.query(
                `UPDATE dedicated_market_settlements
                 SET settled = $2,
                     settled_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
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

        if (existingPayment.reference_module === 'Dedicated Owner Payable'
            && (existingPayment.reference_record_type || SETTLEMENT_REFERENCE_TYPE) === SETTLEMENT_REFERENCE_TYPE) {
            await client.query(
                `UPDATE dedicated_market_settlements
                 SET settled = FALSE,
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
