const pool = require('../config/database');

const READY_STATUS = 'Ready for Settlement';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => Number(toNumber(value, 0).toFixed(2));

const getPendingAdvanceForDriver = async (client, driverId) => {
    const result = await client.query(
        `SELECT
            GREATEST(
                COALESCE((SELECT SUM(da.advance_amount) FROM driver_advances da WHERE da.driver_id = $1), 0)
                -
                COALESCE((
                    SELECT SUM(dar.recovered_amount)
                    FROM driver_advance_recoveries dar
                    JOIN driver_advances da ON da.id = dar.driver_advance_id
                    WHERE da.driver_id = $1
                ), 0),
                0
            )::DECIMAL(12,2) AS pending_advance`,
        [driverId]
    );

    return roundCurrency(result.rows[0]?.pending_advance || 0);
};

const applyDriverAdvanceRecovery = async (client, driverId, ownVehicleSettlementId, recoveryAmount) => {
    let remaining = roundCurrency(recoveryAmount);
    if (remaining <= 0) return 0;

    const pendingAdvancesRes = await client.query(
        `SELECT
            da.id,
            da.advance_amount,
            da.advance_date,
            COALESCE(SUM(dar.recovered_amount), 0)::DECIMAL(12,2) AS recovered_amount
         FROM driver_advances da
         LEFT JOIN driver_advance_recoveries dar ON dar.driver_advance_id = da.id
         WHERE da.driver_id = $1
         GROUP BY da.id, da.advance_amount, da.advance_date
         HAVING (da.advance_amount - COALESCE(SUM(dar.recovered_amount), 0)) > 0
         ORDER BY da.advance_date ASC, da.id ASC`,
        [driverId]
    );

    let recoveredTotal = 0;

    for (const advance of pendingAdvancesRes.rows) {
        if (remaining <= 0) break;

        const pendingAmount = roundCurrency(toNumber(advance.advance_amount) - toNumber(advance.recovered_amount));
        if (pendingAmount <= 0) continue;

        const recoverNow = roundCurrency(Math.min(pendingAmount, remaining));
        if (recoverNow <= 0) continue;

        await client.query(
            `INSERT INTO driver_advance_recoveries
                (driver_advance_id, own_vehicle_settlement_id, recovered_amount)
             VALUES ($1, $2, $3)`,
            [advance.id, ownVehicleSettlementId, recoverNow]
        );

        recoveredTotal = roundCurrency(recoveredTotal + recoverNow);
        remaining = roundCurrency(remaining - recoverNow);
    }

    return recoveredTotal;
};

const getEligibleDrivers = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                d.id,
                d.driver_id,
                d.driver_name,
                d.bank_name,
                d.branch,
                d.account_number,
                d.ifsc_code,
                GREATEST(COALESCE(adv.total_advance_given, 0) - COALESCE(rec.total_recovered, 0), 0)::DECIMAL(12,2) AS pending_advance
             FROM drivers d
             LEFT JOIN (
                SELECT driver_id, SUM(advance_amount) AS total_advance_given
                FROM driver_advances
                GROUP BY driver_id
             ) adv ON adv.driver_id = d.id
             LEFT JOIN (
                SELECT da.driver_id, SUM(dar.recovered_amount) AS total_recovered
                FROM driver_advance_recoveries dar
                JOIN driver_advances da ON da.id = dar.driver_advance_id
                GROUP BY da.driver_id
             ) rec ON rec.driver_id = d.id
             WHERE driver_status = TRUE
             ORDER BY d.driver_name ASC`
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
                la.voucher_datetime AS voucher_date,
                COALESCE(la.to_place, '') AS to_place,
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
                COALESCE(la.fuel_litre, 0)::DECIMAL(12,2) AS fuel_litre,
                COALESCE(la.fuel_amount, (COALESCE(la.fuel_litre, 0) * COALESCE(la.fuel_rate, 0)), 0)::DECIMAL(12,2) AS fuel_amount,
                COALESCE(la.driver_loading_advance, 0)::DECIMAL(12,2) AS driver_loading_advance,
                a.last_odometer::DECIMAL(12,3) AS last_odometer,
                a.current_odometer::DECIMAL(12,3) AS current_odometer,
                a.run_kms::DECIMAL(12,3) AS run_kms,
                a.mileage::DECIMAL(12,3) AS mileage
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
            const deduction = toNumber(voucher.deduction, 0);

            if (parkingCharges < 0 || expenditure1 < 0 || expenditure2 < 0 || expenditure3 < 0 || deduction < 0) {
                return res.status(400).json({ success: false, message: 'Manual expense fields cannot be negative' });
            }

            voucherMetaByAck.set(ackId, {
                parking_charges: Number(parkingCharges.toFixed(2)),
                expenditure_1: Number(expenditure1.toFixed(2)),
                expenditure_2: Number(expenditure2.toFixed(2)),
                expenditure_3: Number(expenditure3.toFixed(2)),
                deduction: Number(deduction.toFixed(2))
            });
            ackIds.push(ackId);
        }

        const voucherRes = await client.query(
            `SELECT
                a.id AS acknowledgement_id,
                la.id AS loading_advance_id,
                la.vehicle_registration_number AS vehicle_number,
                a.voucher_number,
                la.voucher_datetime AS voucher_date,
                COALESCE(la.to_place, '') AS to_place,
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
                COALESCE(la.fuel_litre, 0)::DECIMAL(12,2) AS fuel_litre,
                COALESCE(la.fuel_amount, (COALESCE(la.fuel_litre, 0) * COALESCE(la.fuel_rate, 0)), 0)::DECIMAL(12,2) AS fuel_amount,
                COALESCE(la.driver_loading_advance, 0)::DECIMAL(12,2) AS driver_loading_advance,
                a.last_odometer::DECIMAL(12,3) AS last_odometer,
                a.current_odometer::DECIMAL(12,3) AS current_odometer,
                a.run_kms::DECIMAL(12,3) AS run_kms,
                a.mileage::DECIMAL(12,3) AS mileage
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
                expenditure_3: 0,
                deduction: 0
            };

            if (!voucher.voucher_date) {
                return res.status(400).json({ success: false, message: `Voucher date is missing for voucher ${voucher.voucher_number}` });
            }
            if (!voucher.to_place) {
                return res.status(400).json({ success: false, message: `To Place is missing for voucher ${voucher.voucher_number}` });
            }
            const runMetricsFields = ['last_odometer', 'current_odometer', 'run_kms', 'mileage'];
            for (const field of runMetricsFields) {
                if (voucher[field] === null || voucher[field] === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: `Acknowledgement run metrics are missing for voucher ${voucher.voucher_number}. Please update acknowledgement first.`
                    });
                }
            }

            const driverBata = toNumber(voucher.driver_bata);
            const unloading = toNumber(voucher.unloading);
            const tarpaulin = toNumber(voucher.tarpaulin);
            const cityTax = toNumber(voucher.city_tax);
            const maintenance = toNumber(voucher.maintenance);
            const fuelAmount = toNumber(voucher.fuel_amount);
            const driverLoadingAdvance = toNumber(voucher.driver_loading_advance);

            const totalExpenses = driverBata
                + unloading
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
                deduction: meta.deduction,
                driver_balance: driverBalance
            });
        }

        const roundedTotalDriverBata = Number(totalDriverBata.toFixed(2));
        const roundedTotalDriverBalance = Number(totalDriverBalance.toFixed(2));
        const pendingAdvance = await getPendingAdvanceForDriver(client, driver.id);
        const driverSalaryPayable = Number((roundedTotalDriverBalance - pendingAdvance).toFixed(2));

        await client.query('BEGIN');
        inTx = true;

        const settlementRes = await client.query(
            `INSERT INTO own_vehicle_settlements
                (driver_id, driver_name, cash_bank, bank_name, branch, account_number, ifsc_code,
                 total_driver_bata, total_driver_balance, pending_advance, driver_salary_payable, settled)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
                pendingAdvance,
                driverSalaryPayable,
                true
            ]
        );

        const settlement = settlementRes.rows[0];
        const voucherInsert = `INSERT INTO own_vehicle_settlement_vouchers
            (settlement_id, acknowledgement_id, loading_advance_id, vehicle_number, voucher_number,
             voucher_date, to_place, sum_ifas, driver_bata, unloading, tarpaulin, city_tax, maintenance,
             parking_charges, expenditure_1, expenditure_2, expenditure_3, deduction,
             fuel_litre, fuel_amount, driver_loading_advance, last_odometer, current_odometer, run_kms, mileage, driver_balance)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`;

        for (const voucher of computedVoucherRows) {
            await client.query(voucherInsert, [
                settlement.id,
                voucher.acknowledgement_id,
                voucher.loading_advance_id,
                voucher.vehicle_number,
                voucher.voucher_number,
                voucher.voucher_date || null,
                voucher.to_place || null,
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
                voucher.deduction,
                Number(toNumber(voucher.fuel_litre).toFixed(2)),
                Number(toNumber(voucher.fuel_amount).toFixed(2)),
                Number(toNumber(voucher.driver_loading_advance).toFixed(2)),
                Number(toNumber(voucher.last_odometer).toFixed(3)),
                Number(toNumber(voucher.current_odometer).toFixed(3)),
                Number(toNumber(voucher.run_kms).toFixed(3)),
                Number(toNumber(voucher.mileage).toFixed(3)),
                voucher.driver_balance
            ]);
        }

        // Balance settlement recovers pending driver advances using positive driver balance.
        await applyDriverAdvanceRecovery(
            client,
            driver.id,
            settlement.id,
            Math.max(roundedTotalDriverBalance, 0)
        );

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
