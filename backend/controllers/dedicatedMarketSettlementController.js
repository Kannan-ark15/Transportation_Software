const pool = require('../config/database');
const { calculateDedicatedSettlement } = require('../utils/balanceSettlementCalculations');

const READY_STATUS = 'Ready for Settlement';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getEligibleOwners = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, owner_name, owner_type, bank_name, branch, account_no, ifsc_code
             FROM owners
             WHERE owner_type IN ('Dedicated', 'Market')
               AND status = 'Active'
             ORDER BY owner_name ASC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const getReadyVouchers = async (req, res, next) => {
    try {
        const ownerId = req.query.owner_id ? Number(req.query.owner_id) : null;
        const vehicleNumber = req.query.vehicle_number ? String(req.query.vehicle_number).trim() : null;

        const result = await pool.query(
            `SELECT
                a.id AS acknowledgement_id,
                la.id AS loading_advance_id,
                la.vehicle_registration_number AS vehicle_number,
                a.voucher_number,
                COALESCE(
                    la.sum_ifas,
                    (SELECT SUM(lai.ifa_amount) FROM loading_advance_invoices lai WHERE lai.loading_advance_id = la.id),
                    0
                 )::DECIMAL(12,2) AS sum_ifas
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
             LEFT JOIN dedicated_market_settlement_vouchers dmsv ON dmsv.loading_advance_id = la.id
             WHERE a.voucher_status = $1
               AND la.owner_type IN ('Dedicated', 'Market')
               AND o.status = 'Active'
               AND dmsv.id IS NULL
               AND ($2::INT IS NULL OR o.id = $2)
               AND ($3::TEXT IS NULL OR la.vehicle_registration_number = $3)
             ORDER BY la.vehicle_registration_number ASC, a.voucher_number ASC`,
            [READY_STATUS, ownerId, vehicleNumber || null]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const getAllSettlements = async (req, res, next) => {
    try {
        const result = await pool.query(
             `SELECT
                s.*,
                s.commission_amount AS total_deductions,
                COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers,
                COALESCE(string_agg(sv.voucher_number, ', ' ORDER BY sv.voucher_number), '') AS voucher_numbers
             FROM dedicated_market_settlements s
             LEFT JOIN dedicated_market_settlement_vouchers sv ON sv.settlement_id = s.id
             GROUP BY s.id
             ORDER BY s.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const createSettlement = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const {
            owner_id,
            cash_bank,
            commission_amount,
            vehicle_number,
            selected_vouchers = []
        } = req.body;

        if (!owner_id) {
            return res.status(400).json({ success: false, message: 'owner_id is required' });
        }
        if (!cash_bank || !['Cash', 'Bank'].includes(cash_bank)) {
            return res.status(400).json({ success: false, message: 'cash_bank must be Cash or Bank' });
        }
        if (!vehicle_number || !String(vehicle_number).trim()) {
            return res.status(400).json({ success: false, message: 'vehicle_number is required' });
        }
        if (!Array.isArray(selected_vouchers) || selected_vouchers.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one voucher must be selected' });
        }

        const ownerRes = await client.query(
            `SELECT id, owner_name, owner_type, bank_name, branch, account_no, ifsc_code
             FROM owners
             WHERE id = $1
               AND owner_type IN ('Dedicated', 'Market')
               AND status = 'Active'`,
            [owner_id]
        );
        if (ownerRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid owner selection' });
        }

        const owner = ownerRes.rows[0];
        const effectiveBankName = cash_bank === 'Bank' ? owner.bank_name || null : null;
        const effectiveBranch = cash_bank === 'Bank' ? owner.branch || null : null;
        const effectiveAccountNo = cash_bank === 'Bank' ? owner.account_no || null : null;
        const effectiveIfscCode = cash_bank === 'Bank' ? owner.ifsc_code || null : null;

        if (cash_bank === 'Bank' && (!effectiveBankName || !effectiveBranch || !effectiveAccountNo || !effectiveIfscCode)) {
            return res.status(400).json({ success: false, message: 'Bank details are required when cash_bank is Bank' });
        }

        const ackIds = selected_vouchers
            .map(v => Number(v.acknowledgement_id))
            .filter(v => Number.isInteger(v) && v > 0);
        if (ackIds.length !== selected_vouchers.length) {
            return res.status(400).json({ success: false, message: 'Invalid voucher selection payload' });
        }

        const voucherRes = await client.query(
            `SELECT
                a.id AS acknowledgement_id,
                la.id AS loading_advance_id,
                a.voucher_number,
                la.vehicle_registration_number AS vehicle_number,
                COALESCE(
                    la.sum_ifas,
                    (SELECT SUM(lai.ifa_amount) FROM loading_advance_invoices lai WHERE lai.loading_advance_id = la.id),
                    0
                )::DECIMAL(12,2) AS sum_ifas
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
             LEFT JOIN dedicated_market_settlement_vouchers dmsv ON dmsv.loading_advance_id = la.id
             WHERE a.id = ANY($1::INT[])
               AND a.voucher_status = $2
               AND o.id = $3
               AND la.vehicle_registration_number = $4
               AND dmsv.id IS NULL
             ORDER BY a.id`,
            [ackIds, READY_STATUS, owner_id, String(vehicle_number).trim()]
        );

        if (voucherRes.rows.length !== ackIds.length) {
            return res.status(400).json({ success: false, message: 'One or more selected vouchers are not ready for settlement' });
        }

        let calculated;
        try {
            calculated = calculateDedicatedSettlement({
                sumIfas: voucherRes.rows.reduce((sum, row) => sum + toNumber(row.sum_ifas), 0),
                commissionAmount: commission_amount
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        const {
            sumIfas,
            commissionAmount: safeCommissionAmount,
            totalDeductions,
            settlementBalance,
            commissionPercent
        } = calculated;

        await client.query('BEGIN');
        inTx = true;

        const settlementRes = await client.query(
            `INSERT INTO dedicated_market_settlements
                (owner_id, owner_name, owner_type, cash_bank, bank_name, branch, account_no, ifsc_code,
                 sum_ifas, commission_percent, commission_amount, settlement_balance, settled, settled_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NULL)
             RETURNING *`,
            [
                owner.id,
                owner.owner_name,
                owner.owner_type,
                cash_bank,
                effectiveBankName,
                effectiveBranch,
                effectiveAccountNo,
                effectiveIfscCode,
                sumIfas,
                commissionPercent,
                safeCommissionAmount,
                settlementBalance,
                false
            ]
        );

        const settlement = settlementRes.rows[0];
        settlement.total_deductions = totalDeductions;
        const voucherInsert = `INSERT INTO dedicated_market_settlement_vouchers
            (settlement_id, acknowledgement_id, loading_advance_id, vehicle_number, voucher_number, sum_ifas, commission_amount, final_balance)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;

        let allocatedCommission = 0;
        let totalFinalBalance = 0;
        for (const [index, voucher] of voucherRes.rows.entries()) {
            const voucherSumIfa = Number(toNumber(voucher.sum_ifas).toFixed(2));
            const remainingCommission = Number((safeCommissionAmount - allocatedCommission).toFixed(2));
            const proportionalCommission = sumIfas > 0
                ? Number(((voucherSumIfa / sumIfas) * safeCommissionAmount).toFixed(2))
                : 0;
            const voucherCommission = index === voucherRes.rows.length - 1
                ? remainingCommission
                : Math.max(0, Math.min(remainingCommission, proportionalCommission));
            allocatedCommission = Number((allocatedCommission + voucherCommission).toFixed(2));
            const voucherFinal = Number((voucherSumIfa - voucherCommission).toFixed(2));
            totalFinalBalance += voucherFinal;
            await client.query(voucherInsert, [
                settlement.id,
                voucher.acknowledgement_id,
                voucher.loading_advance_id,
                voucher.vehicle_number,
                voucher.voucher_number,
                voucherSumIfa,
                voucherCommission,
                voucherFinal
            ]);
        }

        const roundedTotalFinalBalance = Number(totalFinalBalance.toFixed(2));
        if (roundedTotalFinalBalance !== settlementBalance) {
            await client.query(
                `UPDATE dedicated_market_settlements
                 SET settlement_balance = $2
                 WHERE id = $1`,
                [settlement.id, roundedTotalFinalBalance]
            );
            settlement.settlement_balance = roundedTotalFinalBalance;
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: settlement });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    getEligibleOwners,
    getReadyVouchers,
    getAllSettlements,
    createSettlement
};
