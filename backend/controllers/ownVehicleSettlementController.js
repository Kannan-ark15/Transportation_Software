const pool = require('../config/database');

const READY_STATUS = 'Ready for Settlement';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getEligibleDrivers = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, driver_id, driver_name, bank_name, branch, account_number, ifsc_code
             FROM drivers
             WHERE driver_status = TRUE
             ORDER BY driver_name ASC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const getReadyVouchers = async (req, res, next) => {
    try {
        const driverId = req.query.driver_id ? Number(req.query.driver_id) : null;
        const vehicleNumber = req.query.vehicle_number ? String(req.query.vehicle_number).trim() : null;

        const result = await pool.query(
            `SELECT
                a.id AS acknowledgement_id,
                la.id AS loading_advance_id,
                la.driver_name,
                la.vehicle_registration_number AS vehicle_number,
                a.voucher_number,
                COALESCE(
                    la.sum_ifas,
                    (SELECT SUM(lai.ifa_amount) FROM loading_advance_invoices lai WHERE lai.loading_advance_id = la.id),
                    0
                )::DECIMAL(12,2) AS sum_ifas,
                COALESCE(la.driver_bata, 0)::DECIMAL(12,2) AS driver_bata,
                COALESCE(la.unloading, 0)::DECIMAL(12,2) AS unloading,
                COALESCE(la.tarpaulin, 0)::DECIMAL(12,2) AS tarpaulin,
                COALESCE(la.city_tax, 0)::DECIMAL(12,2) AS city_tax,
                COALESCE(la.maintenance, 0)::DECIMAL(12,2) AS maintenance,
                COALESCE(la.fuel_amount, (COALESCE(la.fuel_litre, 0) * COALESCE(la.fuel_rate, 0)), 0)::DECIMAL(12,2) AS fuel_amount,
                COALESCE(la.driver_loading_advance, 0)::DECIMAL(12,2) AS driver_loading_advance
             FROM acknowledgements a
             JOIN loading_advances la ON la.id = a.loading_advance_id
             LEFT JOIN own_vehicle_settlement_vouchers ovsv ON ovsv.loading_advance_id = la.id
             WHERE a.voucher_status = $1
               AND LOWER(TRIM(COALESCE(la.owner_type, ''))) = 'own'
               AND ovsv.id IS NULL
               AND EXISTS (
                    SELECT 1
                    FROM drivers d
                    WHERE d.driver_status = TRUE
                        AND d.driver_name = la.driver_name
                        AND ($2::INT IS NULL OR d.id = $2)
               )
               AND ($3::TEXT IS NULL OR la.vehicle_registration_number = $3)
             ORDER BY la.vehicle_registration_number ASC, a.voucher_number ASC`,
            [READY_STATUS, driverId, vehicleNumber || null]
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
                COALESCE(string_agg(DISTINCT sv.vehicle_number, ', ' ORDER BY sv.vehicle_number), '') AS vehicle_numbers,
                COALESCE(string_agg(sv.voucher_number, ', ' ORDER BY sv.voucher_number), '') AS voucher_numbers
             FROM own_vehicle_settlements s
             LEFT JOIN own_vehicle_settlement_vouchers sv ON sv.settlement_id = s.id
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
            driver_id,
            cash_bank,
            bank_name,
            branch,
            account_number,
            ifsc_code,
            selected_vouchers = []
        } = req.body;

        if (!driver_id) {
            return res.status(400).json({ success: false, message: 'driver_id is required' });
        }
        if (!cash_bank || !['Cash', 'Bank'].includes(cash_bank)) {
            return res.status(400).json({ success: false, message: 'cash_bank must be Cash or Bank' });
        }
        if (!Array.isArray(selected_vouchers) || selected_vouchers.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one voucher must be selected' });
        }

        const driverRes = await client.query(
            `SELECT id, driver_name, bank_name, branch, account_number, ifsc_code
             FROM drivers
             WHERE id = $1
               AND driver_status = TRUE`,
            [driver_id]
        );
        if (driverRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid driver selection' });
        }

        const driver = driverRes.rows[0];
        const effectiveBankName = cash_bank === 'Bank' ? (bank_name || driver.bank_name || null) : null;
        const effectiveBranch = cash_bank === 'Bank' ? (branch || driver.branch || null) : null;
        const effectiveAccountNumber = cash_bank === 'Bank' ? (account_number || driver.account_number || null) : null;
        const effectiveIfscCode = cash_bank === 'Bank' ? (ifsc_code || driver.ifsc_code || null) : null;

        if (cash_bank === 'Bank' && (!effectiveBankName || !effectiveBranch || !effectiveAccountNumber || !effectiveIfscCode)) {
            return res.status(400).json({ success: false, message: 'Bank details are required when cash_bank is Bank' });
        }

        const ackIds = [];
        const voucherMetaByAck = new Map();
        for (const voucher of selected_vouchers) {
            const ackId = Number(voucher.acknowledgement_id);
            if (!Number.isInteger(ackId) || ackId <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid voucher selection payload' });
            }

            if (voucherMetaByAck.has(ackId)) {
                return res.status(400).json({ success: false, message: 'Duplicate acknowledgement selected' });
            }

            const parkingCharges = toNumber(voucher.parking_charges, 0);
            const expenditure1 = toNumber(voucher.expenditure_1, 0);
            const expenditure2 = toNumber(voucher.expenditure_2, 0);
            const expenditure3 = toNumber(voucher.expenditure_3, 0);

            if (parkingCharges < 0 || expenditure1 < 0 || expenditure2 < 0 || expenditure3 < 0) {
                return res.status(400).json({ success: false, message: 'Manual expense fields cannot be negative' });
            }

            voucherMetaByAck.set(ackId, {
                parking_charges: Number(parkingCharges.toFixed(2)),
                expenditure_1: Number(expenditure1.toFixed(2)),
                expenditure_2: Number(expenditure2.toFixed(2)),
                expenditure_3: Number(expenditure3.toFixed(2))
            });
            ackIds.push(ackId);
        }

        const voucherRes = await client.query(
            `SELECT
                a.id AS acknowledgement_id,
                la.id AS loading_advance_id,
                la.vehicle_registration_number AS vehicle_number,
                a.voucher_number,
                COALESCE(
                    la.sum_ifas,
                    (SELECT SUM(lai.ifa_amount) FROM loading_advance_invoices lai WHERE lai.loading_advance_id = la.id),
                    0
                )::DECIMAL(12,2) AS sum_ifas,
                COALESCE(la.driver_bata, 0)::DECIMAL(12,2) AS driver_bata,
                COALESCE(la.unloading, 0)::DECIMAL(12,2) AS unloading,
                COALESCE(la.tarpaulin, 0)::DECIMAL(12,2) AS tarpaulin,
                COALESCE(la.city_tax, 0)::DECIMAL(12,2) AS city_tax,
                COALESCE(la.maintenance, 0)::DECIMAL(12,2) AS maintenance,
                COALESCE(la.fuel_amount, (COALESCE(la.fuel_litre, 0) * COALESCE(la.fuel_rate, 0)), 0)::DECIMAL(12,2) AS fuel_amount,
                COALESCE(la.driver_loading_advance, 0)::DECIMAL(12,2) AS driver_loading_advance
             FROM acknowledgements a
             JOIN loading_advances la ON la.id = a.loading_advance_id
             LEFT JOIN own_vehicle_settlement_vouchers ovsv ON ovsv.loading_advance_id = la.id
             WHERE a.id = ANY($1::INT[])
               AND a.voucher_status = $2
               AND LOWER(TRIM(COALESCE(la.owner_type, ''))) = 'own'
               AND la.driver_name = $3
               AND ovsv.id IS NULL
             ORDER BY a.id`,
            [ackIds, READY_STATUS, driver.driver_name]
        );

        if (voucherRes.rows.length !== ackIds.length) {
            return res.status(400).json({ success: false, message: 'One or more selected vouchers are not ready for settlement' });
        }

        let totalDriverBata = 0;
        let totalDriverBalance = 0;
        const computedVoucherRows = [];

        for (const voucher of voucherRes.rows) {
            const meta = voucherMetaByAck.get(voucher.acknowledgement_id) || {
                parking_charges: 0,
                expenditure_1: 0,
                expenditure_2: 0,
                expenditure_3: 0
            };

            const driverBata = toNumber(voucher.driver_bata);
            const unloading = toNumber(voucher.unloading);
            const tarpaulin = toNumber(voucher.tarpaulin);
            const cityTax = toNumber(voucher.city_tax);
            const maintenance = toNumber(voucher.maintenance);
            const fuelAmount = toNumber(voucher.fuel_amount);
            const driverLoadingAdvance = toNumber(voucher.driver_loading_advance);

            const totalExpenses = unloading
                + tarpaulin
                + cityTax
                + maintenance
                + meta.parking_charges
                + meta.expenditure_1
                + meta.expenditure_2
                + meta.expenditure_3
                + fuelAmount;

            const driverBalance = Number((driverLoadingAdvance - totalExpenses).toFixed(2));

            totalDriverBata += driverBata;
            totalDriverBalance += driverBalance;

            computedVoucherRows.push({
                ...voucher,
                parking_charges: meta.parking_charges,
                expenditure_1: meta.expenditure_1,
                expenditure_2: meta.expenditure_2,
                expenditure_3: meta.expenditure_3,
                driver_balance: driverBalance
            });
        }

        const roundedTotalDriverBata = Number(totalDriverBata.toFixed(2));
        const roundedTotalDriverBalance = Number(totalDriverBalance.toFixed(2));
        const driverSalaryPayable = Number((roundedTotalDriverBata - roundedTotalDriverBalance).toFixed(2));

        await client.query('BEGIN');
        inTx = true;

        const settlementRes = await client.query(
            `INSERT INTO own_vehicle_settlements
                (driver_id, driver_name, cash_bank, bank_name, branch, account_number, ifsc_code,
                 total_driver_bata, total_driver_balance, driver_salary_payable, settled)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [
                driver.id,
                driver.driver_name,
                cash_bank,
                effectiveBankName,
                effectiveBranch,
                effectiveAccountNumber,
                effectiveIfscCode,
                roundedTotalDriverBata,
                roundedTotalDriverBalance,
                driverSalaryPayable,
                true
            ]
        );

        const settlement = settlementRes.rows[0];
        const voucherInsert = `INSERT INTO own_vehicle_settlement_vouchers
            (settlement_id, acknowledgement_id, loading_advance_id, vehicle_number, voucher_number,
             sum_ifas, driver_bata, unloading, tarpaulin, city_tax, maintenance,
             parking_charges, expenditure_1, expenditure_2, expenditure_3,
             fuel_amount, driver_loading_advance, driver_balance)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`;

        for (const voucher of computedVoucherRows) {
            await client.query(voucherInsert, [
                settlement.id,
                voucher.acknowledgement_id,
                voucher.loading_advance_id,
                voucher.vehicle_number,
                voucher.voucher_number,
                Number(toNumber(voucher.sum_ifas).toFixed(2)),
                Number(toNumber(voucher.driver_bata).toFixed(2)),
                Number(toNumber(voucher.unloading).toFixed(2)),
                Number(toNumber(voucher.tarpaulin).toFixed(2)),
                Number(toNumber(voucher.city_tax).toFixed(2)),
                Number(toNumber(voucher.maintenance).toFixed(2)),
                voucher.parking_charges,
                voucher.expenditure_1,
                voucher.expenditure_2,
                voucher.expenditure_3,
                Number(toNumber(voucher.fuel_amount).toFixed(2)),
                Number(toNumber(voucher.driver_loading_advance).toFixed(2)),
                voucher.driver_balance
            ]);
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
    getEligibleDrivers,
    getReadyVouchers,
    getAllSettlements,
    createSettlement
};

