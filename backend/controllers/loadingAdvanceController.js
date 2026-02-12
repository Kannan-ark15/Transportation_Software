const pool = require('../config/database');

const getFinancialYear = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const isAfterMarch = d.getMonth() >= 3;
    const start = isAfterMarch ? year : year - 1;
    const end = start + 1;
    return String(start).slice(2) + String(end).slice(2);
};

const normalizePrefix = (val) => {
    const raw = String(val || '').toUpperCase().trim();
    const map = {
        ARIYALUR: 'ARY',
        ALATHIYUR: 'PND',
        'HEAD OFFICE': 'HOF',
        HEADOFFICE: 'HOF',
        HOF: 'HOF',
        ARY: 'ARY',
        PND: 'PND'
    };
    return map[raw] || raw.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'HOF';
};

const buildVoucherNumber = async (loginPrefix = 'HOF', date = new Date()) => {
    const prefix = normalizePrefix(loginPrefix);
    const fy = getFinancialYear(date);
    const like = `${prefix}${fy}%`;
    const result = await pool.query(
        'SELECT MAX(CAST(RIGHT(voucher_number, 4) AS INT)) AS last_seq FROM loading_advances WHERE voucher_number LIKE $1',
        [like]
    );
    const next = (result.rows[0]?.last_seq || 0) + 1;
    return `${prefix}${fy}${String(next).padStart(4, '0')}`;
};

const existsVehicle = async (vehicleNo) => {
    const result = await pool.query('SELECT 1 FROM vehicles WHERE vehicle_no = $1', [vehicleNo]);
    return result.rows.length > 0;
};

const existsProduct = async (productName) => {
    const result = await pool.query('SELECT 1 FROM products WHERE product_name = $1', [productName]);
    return result.rows.length > 0;
};

const findPlaceByNameAndProduct = async (to_place, product_name) => {
    const result = await pool.query(
        `SELECT p.id
         FROM places p
         JOIN products pr ON p.product_id = pr.id
         WHERE p.to_place = $1 AND pr.product_name = $2
         LIMIT 1`,
        [to_place, product_name]
    );
    return result.rows[0];
};

const dealerExistsForPlace = async (dealer_name, place_id) => {
    const result = await pool.query(
        'SELECT 1 FROM dealers WHERE dealer_name = $1 AND place_id = $2',
        [dealer_name, place_id]
    );
    return result.rows.length > 0;
};

const getNextVoucher = async (req, res, next) => {
    try {
        const { login_prefix } = req.query;
        if (!login_prefix) {
            return res.status(400).json({ success: false, message: 'login_prefix is required' });
        }
        const voucher_number = await buildVoucherNumber(login_prefix);
        res.status(200).json({ success: true, data: { voucher_number } });
    } catch (error) { next(error); }
};

const getAllLoadingAdvances = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM loading_advances ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getLoadingAdvanceInvoices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT lai.id, lai.invoice_number, lai.to_place, lai.dealer_name, lai.kt_freight,
                    lai.quantity, lai.ifa_amount, la.invoice_date
             FROM loading_advance_invoices lai
             JOIN loading_advances la ON la.id = lai.loading_advance_id
             WHERE lai.loading_advance_id = $1
             ORDER BY lai.id`,
            [id]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const createLoadingAdvance = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            login_prefix,
            vehicle_registration_number,
            vehicle_type,
            vehicle_sub_type,
            vehicle_body_type,
            owner_name,
            owner_type,
            product_name,
            invoice_date,
            invoices = [],
            driver_bata,
            unloading,
            tarpaulin,
            city_tax,
            maintenance,
            pump_name,
            fuel_litre,
            fuel_rate,
            driver_name,
            driver_loading_advance
        } = req.body;

        const required = {
            vehicle_registration_number,
            vehicle_type,
            vehicle_sub_type,
            vehicle_body_type,
            owner_name,
            owner_type,
            product_name,
            invoice_date,
            driver_bata,
            unloading,
            pump_name,
            fuel_litre,
            fuel_rate,
            driver_loading_advance
        };
        const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
        if (missing.length) return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });
        if (!Array.isArray(invoices) || invoices.length === 0) return res.status(400).json({ success: false, message: 'At least one invoice is required' });

        if (!(await existsVehicle(vehicle_registration_number))) return res.status(400).json({ success: false, message: 'Invalid vehicle registration number' });
        if (!(await existsProduct(product_name))) return res.status(400).json({ success: false, message: 'Invalid product name' });

        const ownerTypeLower = String(owner_type || '').toLowerCase();
        const isCommissioned = ownerTypeLower === 'dedicated' || ownerTypeLower === 'market';
        if (!isCommissioned && !driver_name) return res.status(400).json({ success: false, message: 'Driver name is required' });
        const commission_pct = isCommissioned ? 6 : 0;
        const parsedDriverBata = Number(driver_bata) || 0;
        const parsedUnloading = Number(unloading) || 0;
        const parsedTarpaulin = (String(vehicle_body_type || '').toLowerCase().includes('container')) ? 0 : (Number(tarpaulin) || 0);
        const parsedCityTax = Number(city_tax) || 0;
        const parsedMaintenance = Number(maintenance) || 0;


        const pumpRes = await client.query('SELECT rate FROM pumps WHERE pump_name = $1', [pump_name]);
        if (pumpRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid pump selection' });
        const pumpRate = Number(pumpRes.rows[0].rate);
        const parsedFuelRate = Number(fuel_rate) || pumpRate || 0;
        const parsedFuelLitre = Number(fuel_litre) || 0;
        const fuel_amount = parsedFuelLitre * parsedFuelRate;

        const seen = new Set();
        const invoiceRows = [];
        for (const inv of invoices) {
            const invoice_number = inv.invoice_number;
            const to_place = inv.to_place;
            const dealer_name = inv.dealer_name;
            const quantity = inv.quantity;
            const kt_freight = inv.kt_freight;
            if (!invoice_number || !to_place || !dealer_name || !quantity || !kt_freight) {
                return res.status(400).json({ success: false, message: 'Invoice fields are missing' });
            }
            if (seen.has(invoice_number)) return res.status(400).json({ success: false, message: 'Duplicate invoice number' });
            seen.add(invoice_number);
            const place = await findPlaceByNameAndProduct(to_place, product_name);
            if (!place) return res.status(400).json({ success: false, message: 'Invalid place for selected product' });
            if (!(await dealerExistsForPlace(dealer_name, place.id))) return res.status(400).json({ success: false, message: 'Invalid dealer for selected place' });
            const parsedQty = Number(quantity);
            const parsedKt = Number(kt_freight);
            const ifa_amount = Number.isFinite(parsedQty) && Number.isFinite(parsedKt) ? parsedQty * parsedKt : 0;
            invoiceRows.push({ invoice_number, to_place, dealer_name, kt_freight: parsedKt || 0, quantity: parsedQty || 0, ifa_amount });
        }

        const sum_ifas = invoiceRows.reduce((s, r) => s + (Number(r.ifa_amount) || 0), 0);
        const commission_amount = isCommissioned ? (sum_ifas * commission_pct) / 100 : 0;
        const expenseSum = parsedDriverBata + parsedUnloading + parsedTarpaulin + parsedCityTax + parsedMaintenance;
        const predefined_expenses = commission_amount + parsedUnloading + parsedTarpaulin + parsedCityTax + parsedMaintenance;
        const gross_amount = isCommissioned ? (commission_amount - expenseSum) : (sum_ifas - expenseSum);
        const parsedDriverLoadingAdvance = Number(driver_loading_advance) || 0;
        const trip_balance = parsedDriverLoadingAdvance - fuel_amount - gross_amount;

        const voucher_number = await buildVoucherNumber(login_prefix);
        const firstInv = invoiceRows[0];
        await client.query('BEGIN');
        const insertMain = `
            INSERT INTO loading_advances
            (voucher_number, vehicle_registration_number, vehicle_type, vehicle_sub_type, vehicle_body_type, owner_name, owner_type, product_name, invoice_number, to_place, dealer_name, kt_freight, quantity, ifa_amount, sum_ifas, driver_bata, unloading, tarpaulin, city_tax, maintenance, pump_name, fuel_litre, fuel_rate, fuel_amount, driver_name, driver_loading_advance, trip_balance, commission_pct, predefined_expenses, invoice_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
            RETURNING *
        `;
        const mainVals = [
            voucher_number,
            vehicle_registration_number,
            vehicle_type,
            vehicle_sub_type,
            vehicle_body_type,
            owner_name,
            owner_type,
            product_name,
            firstInv.invoice_number,
            firstInv.to_place,
            firstInv.dealer_name,
            firstInv.kt_freight,
            firstInv.quantity,
            firstInv.ifa_amount,
            sum_ifas,
            parsedDriverBata,
            parsedUnloading,
            parsedTarpaulin,
            parsedCityTax,
            parsedMaintenance,
            pump_name,
            parsedFuelLitre,
            parsedFuelRate,
            fuel_amount,
            isCommissioned ? null : driver_name,
            parsedDriverLoadingAdvance,
            trip_balance,
            commission_pct,
            predefined_expenses,
            invoice_date
        ];
        const result = await client.query(insertMain, mainVals);
        const loadingAdvanceId = result.rows[0].id;

        const invoiceInsert = `
            INSERT INTO loading_advance_invoices
            (loading_advance_id, invoice_number, to_place, dealer_name, kt_freight, quantity, ifa_amount)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
        `;
        for (const inv of invoiceRows) {
            await client.query(invoiceInsert, [
                loadingAdvanceId,
                inv.invoice_number,
                inv.to_place,
                inv.dealer_name,
                inv.kt_freight,
                inv.quantity,
                inv.ifa_amount
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = { getAllLoadingAdvances, createLoadingAdvance, getNextVoucher, getLoadingAdvanceInvoices };
