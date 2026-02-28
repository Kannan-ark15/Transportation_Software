const pool = require('../config/database');

const toMoney = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Number(parsed.toFixed(2));
};

const parseDueSettled = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'settled', 'yes', 'y'].includes(normalized)) return true;
        if (['false', '0', 'not settled', 'not_settled', 'no', 'n'].includes(normalized)) return false;
    }
    return null;
};

const buildSummary = (totalInstallments, totalDue, rows) => {
    const paidRows = rows.filter((row) => Boolean(row.due_settled));
    const installmentsPaid = paidRows.length;
    const normalizedInstallments = Number(totalInstallments) || 0;
    const installmentsToBePaid = Math.max(normalizedInstallments - installmentsPaid, 0);

    const paidDue = toMoney(
        paidRows.reduce((sum, row) => sum + Number(row.due_amount || 0), 0)
    );
    const normalizedTotalDue = toMoney(totalDue);
    const balanceDue = toMoney(Math.max(normalizedTotalDue - paidDue, 0));
    const balancePercentage = normalizedTotalDue > 0
        ? toMoney((balanceDue / normalizedTotalDue) * 100)
        : 0;

    return {
        installments_paid: installmentsPaid,
        installments_to_be_paid: installmentsToBePaid,
        paid_due: paidDue,
        balance_due: balanceDue,
        balance_percentage: balancePercentage
    };
};

const ensureTrackingTableExists = async (client) => {
    const result = await client.query(`SELECT to_regclass('public.loan_repayment_trackings') AS table_name`);
    if (!result.rows[0]?.table_name) {
        const error = new Error('Loan repayment schema is missing. Run patch_2026_02_28_loan_repayment.sql');
        error.statusCode = 500;
        throw error;
    }
};

const ensureTrackingRows = async (client, loanMasterId = null) => {
    const query = `
        INSERT INTO loan_repayment_trackings (
            loan_master_id,
            loan_master_schedule_id,
            installment_number,
            due_date,
            principal,
            interest,
            due_amount,
            outstanding_principal,
            due_settled
        )
        SELECT
            lms.loan_master_id,
            lms.id,
            lms.installment_number,
            lms.due_date,
            lms.principal,
            lms.interest,
            lms.due_amount,
            lms.outstanding_principal,
            FALSE
        FROM loan_master_schedules lms
        LEFT JOIN loan_repayment_trackings lrt
            ON lrt.loan_master_schedule_id = lms.id
        WHERE lrt.id IS NULL
          AND ($1::INTEGER IS NULL OR lms.loan_master_id = $1::INTEGER)
    `;
    await client.query(query, [loanMasterId]);
};

const getLoanRepaymentMeta = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await ensureTrackingTableExists(client);
        await ensureTrackingRows(client);

        const result = await client.query(
            `SELECT DISTINCT ON (lm.vehicle_id)
                lm.id AS loan_master_id,
                lm.vehicle_id,
                COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number,
                lm.agreement_number,
                lm.financier,
                lm.total_installments,
                lm.loan_amount,
                lm.total_due
             FROM loan_masters lm
             LEFT JOIN vehicles v ON v.id = lm.vehicle_id
             WHERE lm.vehicle_id IS NOT NULL
               AND COALESCE(v.vehicle_financial_status, 'Free') = 'Loan'
             ORDER BY lm.vehicle_id, lm.created_at DESC, lm.id DESC`
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const getAllLoanRepayments = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await ensureTrackingTableExists(client);
        await ensureTrackingRows(client);

        const result = await client.query(
            `SELECT
                lm.id AS loan_master_id,
                lm.vehicle_id,
                COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number,
                lm.agreement_number,
                lm.financier,
                lm.total_installments,
                lm.loan_amount,
                lm.total_due,
                COALESCE(SUM(CASE WHEN lrt.due_settled THEN 1 ELSE 0 END), 0)::INTEGER AS installments_paid,
                GREATEST(
                    lm.total_installments - COALESCE(SUM(CASE WHEN lrt.due_settled THEN 1 ELSE 0 END), 0),
                    0
                )::INTEGER AS installments_to_be_paid,
                COALESCE(SUM(CASE WHEN lrt.due_settled THEN lrt.due_amount ELSE 0 END), 0)::DECIMAL(12, 2) AS paid_due,
                GREATEST(
                    lm.total_due - COALESCE(SUM(CASE WHEN lrt.due_settled THEN lrt.due_amount ELSE 0 END), 0),
                    0
                )::DECIMAL(12, 2) AS balance_due,
                CASE
                    WHEN lm.total_due > 0
                        THEN ROUND(
                            (
                                GREATEST(
                                    lm.total_due - COALESCE(SUM(CASE WHEN lrt.due_settled THEN lrt.due_amount ELSE 0 END), 0),
                                    0
                                ) / lm.total_due
                            ) * 100,
                            2
                        )
                    ELSE 0
                END AS balance_percentage
             FROM loan_masters lm
             LEFT JOIN vehicles v ON v.id = lm.vehicle_id
             LEFT JOIN loan_repayment_trackings lrt ON lrt.loan_master_id = lm.id
             GROUP BY lm.id, v.vehicle_no
             ORDER BY lm.created_at DESC, lm.id DESC`
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const getLoanRepaymentByVehicle = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const vehicleId = Number(req.params.vehicleId);
        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid vehicle id is required' });
        }

        await ensureTrackingTableExists(client);

        const masterRes = await client.query(
            `SELECT
                lm.id AS loan_master_id,
                lm.vehicle_id,
                COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number,
                lm.agreement_number,
                lm.financier,
                lm.total_installments,
                lm.loan_amount,
                lm.total_due
             FROM loan_masters lm
             LEFT JOIN vehicles v ON v.id = lm.vehicle_id
             WHERE lm.vehicle_id = $1
             ORDER BY lm.created_at DESC, lm.id DESC
             LIMIT 1`,
            [vehicleId]
        );

        if (masterRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No loan master found for selected vehicle' });
        }

        const master = masterRes.rows[0];
        await ensureTrackingRows(client, master.loan_master_id);

        const rowsRes = await client.query(
            `SELECT
                id,
                loan_master_id,
                loan_master_schedule_id,
                installment_number,
                due_date,
                principal,
                interest,
                due_amount,
                outstanding_principal,
                due_settled
             FROM loan_repayment_trackings
             WHERE loan_master_id = $1
             ORDER BY installment_number ASC`,
            [master.loan_master_id]
        );

        const summary = buildSummary(master.total_installments, master.total_due, rowsRes.rows);

        res.status(200).json({
            success: true,
            data: {
                ...master,
                installments: rowsRes.rows,
                summary
            }
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const updateLoanRepaymentStatus = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid repayment row id is required' });
        }

        await ensureTrackingTableExists(client);

        const dueSettled = parseDueSettled(req.body?.due_settled);
        if (dueSettled === null) {
            return res.status(400).json({ success: false, message: 'due_settled must be true/false or Settled/Not Settled' });
        }

        const updateRes = await client.query(
            `UPDATE loan_repayment_trackings
             SET due_settled = $2,
                 settled_at = CASE WHEN $2 THEN COALESCE(settled_at, CURRENT_TIMESTAMP) ELSE NULL END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, dueSettled]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Loan repayment row not found' });
        }

        const updatedRow = updateRes.rows[0];

        const [masterRes, rowsRes] = await Promise.all([
            client.query(
                `SELECT total_installments, total_due
                 FROM loan_masters
                 WHERE id = $1`,
                [updatedRow.loan_master_id]
            ),
            client.query(
                `SELECT due_amount, due_settled
                 FROM loan_repayment_trackings
                 WHERE loan_master_id = $1`,
                [updatedRow.loan_master_id]
            )
        ]);

        const summary = buildSummary(
            masterRes.rows[0]?.total_installments || 0,
            masterRes.rows[0]?.total_due || 0,
            rowsRes.rows
        );

        res.status(200).json({ success: true, data: updatedRow, summary });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    getLoanRepaymentMeta,
    getAllLoanRepayments,
    getLoanRepaymentByVehicle,
    updateLoanRepaymentStatus
};
