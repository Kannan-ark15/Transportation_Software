const pool = require('../config/database');

const getReminderDashboard = async (req, res, next) => {
    try {
        const result = await pool.query(
            `WITH reminder_sources AS (
                -- Masters: Vehicle compliance due dates
                SELECT
                    'Masters'::TEXT AS category,
                    'Vehicle Pollution'::TEXT AS item,
                    v.vehicle_no::TEXT AS vehicle_party,
                    v.pollution_expiry_date::DATE AS due_date,
                    NULL::DECIMAL(12, 2) AS amount,
                    FALSE AS default_settled,
                    COALESCE(v.updated_at, v.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('MASTER_VEHICLE_POLLUTION_' || v.id)::TEXT AS reminder_key
                FROM vehicles v
                WHERE v.pollution_expiry_date IS NOT NULL
                  AND COALESCE(v.status, 'Active') = 'Active'

                UNION ALL

                SELECT
                    'Masters'::TEXT AS category,
                    'Vehicle Permit'::TEXT AS item,
                    v.vehicle_no::TEXT AS vehicle_party,
                    v.permit_till_date::DATE AS due_date,
                    NULL::DECIMAL(12, 2) AS amount,
                    FALSE AS default_settled,
                    COALESCE(v.updated_at, v.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('MASTER_VEHICLE_PERMIT_' || v.id)::TEXT AS reminder_key
                FROM vehicles v
                WHERE v.permit_till_date IS NOT NULL
                  AND COALESCE(v.status, 'Active') = 'Active'

                UNION ALL

                SELECT
                    'Masters'::TEXT AS category,
                    'Vehicle FC'::TEXT AS item,
                    v.vehicle_no::TEXT AS vehicle_party,
                    v.fc_till_date::DATE AS due_date,
                    NULL::DECIMAL(12, 2) AS amount,
                    FALSE AS default_settled,
                    COALESCE(v.updated_at, v.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('MASTER_VEHICLE_FC_' || v.id)::TEXT AS reminder_key
                FROM vehicles v
                WHERE v.fc_till_date IS NOT NULL
                  AND COALESCE(v.status, 'Active') = 'Active'

                UNION ALL

                SELECT
                    'Masters'::TEXT AS category,
                    'Driver License Expiry'::TEXT AS item,
                    d.driver_name::TEXT AS vehicle_party,
                    d.license_exp_date::DATE AS due_date,
                    NULL::DECIMAL(12, 2) AS amount,
                    FALSE AS default_settled,
                    COALESCE(d.updated_at, d.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('MASTER_DRIVER_LICENSE_' || d.id)::TEXT AS reminder_key
                FROM drivers d
                WHERE d.license_exp_date IS NOT NULL
                  AND COALESCE(d.driver_status, TRUE) = TRUE

                UNION ALL

                -- Advances and Loans: Loan repayment installments
                SELECT
                    'Advances and Loans'::TEXT AS category,
                    'Loan Installment'::TEXT AS item,
                    (
                        COALESCE(v.vehicle_no, lm.vehicle_number, '-') ||
                        ' / AG-' || COALESCE(lm.agreement_number, '-')
                    )::TEXT AS vehicle_party,
                    lrt.due_date::DATE AS due_date,
                    lrt.due_amount::DECIMAL(12, 2) AS amount,
                    COALESCE(lrt.due_settled, FALSE) AS default_settled,
                    COALESCE(lrt.created_at, lm.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('LOAN_INSTALLMENT_' || lrt.id)::TEXT AS reminder_key
                FROM loan_repayment_trackings lrt
                JOIN loan_masters lm ON lm.id = lrt.loan_master_id
                LEFT JOIN vehicles v ON v.id = lm.vehicle_id
                WHERE lrt.due_date IS NOT NULL

                UNION ALL

                -- Transactions: Acknowledgement Pending / Shortage
                SELECT
                    'Transactions'::TEXT AS category,
                    CASE
                        WHEN ai.status = 'Pending' THEN 'Acknowledgement Pending'
                        WHEN ai.status = 'Shortage' THEN 'Acknowledgement Shortage'
                        ELSE 'Acknowledgement'
                    END::TEXT AS item,
                    COALESCE(la.vehicle_registration_number, ai.dealer_name, ai.invoice_number)::TEXT AS vehicle_party,
                    ai.acknowledgement_date::DATE AS due_date,
                    CASE
                        WHEN ai.status = 'Pending' THEN COALESCE(ai.ifa_amount, 0)
                        WHEN ai.status = 'Shortage' THEN GREATEST(COALESCE(ai.ifa_amount, 0) - COALESCE(ai.returned_amount, 0), 0)
                        ELSE NULL
                    END::DECIMAL(12, 2) AS amount,
                    FALSE AS default_settled,
                    COALESCE(ai.created_at, a.created_at, CURRENT_TIMESTAMP) AS fifo_order_ts,
                    ('TX_ACK_' || ai.id)::TEXT AS reminder_key
                FROM acknowledgement_invoices ai
                JOIN acknowledgements a ON a.id = ai.acknowledgement_id
                LEFT JOIN loading_advances la ON la.id = a.loading_advance_id
                WHERE ai.status IN ('Pending', 'Shortage')
                  AND ai.acknowledgement_date IS NOT NULL
            )
            SELECT
                rs.category,
                rs.item,
                rs.vehicle_party,
                rs.due_date,
                (rs.due_date - CURRENT_DATE)::INT AS days_remaining,
                rs.amount,
                COALESCE(rst.is_settled, rs.default_settled, FALSE) AS is_settled,
                rs.reminder_key
            FROM reminder_sources rs
            LEFT JOIN reminder_statuses rst ON rst.reminder_key = rs.reminder_key
            ORDER BY rs.due_date ASC, rs.fifo_order_ts ASC, rs.reminder_key ASC`
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const updateReminderSettledStatus = async (req, res, next) => {
    try {
        const { reminder_key, is_settled } = req.body;

        if (!reminder_key || typeof reminder_key !== 'string') {
            return res.status(400).json({ success: false, message: 'reminder_key is required' });
        }

        if (typeof is_settled !== 'boolean') {
            return res.status(400).json({ success: false, message: 'is_settled must be boolean' });
        }

        const result = await pool.query(
            `INSERT INTO reminder_statuses (reminder_key, is_settled)
             VALUES ($1, $2)
             ON CONFLICT (reminder_key)
             DO UPDATE SET is_settled = EXCLUDED.is_settled, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [reminder_key, is_settled]
        );

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getReminderDashboard,
    updateReminderSettledStatus
};
