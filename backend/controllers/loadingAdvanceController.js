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

const normalizePlaceKey = (val) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const getFromPlaceAliasesForPrefix = (loginPrefix) => {
    const normalizedPrefix = normalizePrefix(loginPrefix);
    if (normalizedPrefix === 'HOF') return [];
    const map = {
        ARY: ['ARIYALUR', 'ARY'],
        PND: ['ALATHIYUR', 'ALATHIUR', 'PND']
    };
    const aliases = map[normalizedPrefix] || [normalizedPrefix];
    return Array.from(new Set(aliases.map(normalizePlaceKey).filter(Boolean)));
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

const buildFromPlaceClause = (fromPlaceAliases = [], startIndex = 1) => {
    if (!Array.isArray(fromPlaceAliases) || fromPlaceAliases.length === 0) {
        return { clause: '', values: [] };
    }
    return {
        clause: ` AND UPPER(REGEXP_REPLACE(COALESCE(p.from_place, ''), '[^A-Z0-9]', '', 'g')) = ANY($${startIndex})`,
        values: [fromPlaceAliases]
    };
};

const findPlaceByIdAndProduct = async (place_id, product_name, fromPlaceAliases = []) => {
    const fromPlaceFilter = buildFromPlaceClause(fromPlaceAliases, 3);
    const result = await pool.query(
        `SELECT p.id, p.to_place
         FROM places p
         JOIN products pr ON p.product_id = pr.id
         WHERE p.id = $1
           AND pr.product_name = $2${fromPlaceFilter.clause}
         LIMIT 1`,
        [place_id, product_name, ...fromPlaceFilter.values]
    );
    return result.rows[0] || null;
};

const findPlaceByNameAndProduct = async (to_place, product_name, fromPlaceAliases = []) => {
    const fromPlaceFilter = buildFromPlaceClause(fromPlaceAliases, 3);
    const result = await pool.query(
        `SELECT p.id, p.to_place
         FROM places p
         JOIN products pr ON p.product_id = pr.id
         WHERE LOWER(TRIM(p.to_place)) = LOWER(TRIM($1))
           AND pr.product_name = $2${fromPlaceFilter.clause}
         ORDER BY p.id
         LIMIT 1`,
        [to_place, product_name, ...fromPlaceFilter.values]
    );
    return result.rows[0] || null;
};

const dealerExistsForToPlace = async (dealer_name, to_place) => {
    const result = await pool.query(
        `SELECT 1
         FROM dealers d
         JOIN places p ON p.id = d.place_id
         WHERE LOWER(TRIM(d.dealer_name)) = LOWER(TRIM($1))
           AND UPPER(REGEXP_REPLACE(COALESCE(p.to_place, ''), '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(COALESCE($2, ''), '[^A-Z0-9]', '', 'g'))
         LIMIT 1`,
        [dealer_name, to_place]
    );
    return result.rows.length > 0;
};

const findPlaceRateCard = async (client, placeId, vehicle_type, vehicle_sub_type, vehicle_body_type) => {
    const result = await client.query(
        `
            SELECT rc.*
            FROM place_rate_cards prc
            JOIN rate_cards rc ON rc.id = prc.rate_card_id
            WHERE prc.place_id = $1
              AND rc.vehicle_type IS NOT DISTINCT FROM $2
              AND rc.vehicle_sub_type IS NOT DISTINCT FROM $3
              AND rc.vehicle_body_type IS NOT DISTINCT FROM $4
            ORDER BY prc.id
            LIMIT 1
        `,
        [placeId, vehicle_type, vehicle_sub_type, vehicle_body_type]
    );
    return result.rows[0] || null;
};

const upsertPlaceRateCardFromTransaction = async (client, rateCardData) => {
    const {
        place_id,
        vehicle_type,
        vehicle_sub_type,
        vehicle_body_type,
        kt_freight,
        driver_bata,
        advance,
        unloading,
        tarpaulin,
        city_tax,
        maintenance
    } = rateCardData;

    if (!place_id) return;

    const parsedKtFreight = Number(kt_freight) || 0;
    const parsedDriverBata = Number(driver_bata) || 0;
    const parsedAdvance = Number(advance) || 0;
    const parsedUnloading = Number(unloading) || 0;
    const parsedCityTax = Number(city_tax) || 0;
    const parsedMaintenance = Number(maintenance) || 0;
    const isOpenContainer = String(vehicle_body_type || '').trim().toLowerCase() === 'open container';
    const parsedTarpaulin = isOpenContainer ? (Number(tarpaulin) || 0) : null;

    const existingRateCard = await findPlaceRateCard(
        client,
        place_id,
        vehicle_type,
        vehicle_sub_type,
        vehicle_body_type
    );

    if (existingRateCard) {
        await client.query(
            `
                UPDATE rate_cards
                SET kt_freight = $2,
                    driver_bata = $3,
                    advance = $4,
                    unloading = $5,
                    tarpaulin = $6,
                    city_tax = $7,
                    maintenance = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            [
                existingRateCard.id,
                parsedKtFreight,
                parsedDriverBata,
                parsedAdvance,
                parsedUnloading,
                parsedTarpaulin,
                parsedCityTax,
                parsedMaintenance
            ]
        );
        return;
    }

    const createdRateCard = await client.query(
        `
            INSERT INTO rate_cards
            (vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `,
        [
            vehicle_type || null,
            vehicle_sub_type || null,
            vehicle_body_type || null,
            parsedKtFreight + 1,
            parsedKtFreight,
            parsedDriverBata,
            parsedAdvance,
            parsedUnloading,
            parsedTarpaulin,
            parsedCityTax,
            parsedMaintenance
        ]
    );

    await client.query(
        'INSERT INTO place_rate_cards (place_id, rate_card_id) VALUES ($1, $2)',
        [place_id, createdRateCard.rows[0].id]
    );
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

const getLoadingAdvanceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM loading_advances WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Loading advance not found' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
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
            driver_loading_advance,
            tds = 0
        } = req.body;

        const ownerTypeLower = String(owner_type || '').toLowerCase();
        const isDedicated = ownerTypeLower === 'dedicated';
        const isCommissioned = isDedicated || ownerTypeLower === 'market';

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
            unloading
        };
        if (!isDedicated) {
            required.pump_name = pump_name;
            required.fuel_litre = fuel_litre;
            required.fuel_rate = fuel_rate;
            required.driver_loading_advance = driver_loading_advance;
        }
        const isFieldEmpty = (v) => v === '' || v === null || v === undefined;
        const missing = Object.entries(required).filter(([, v]) => isFieldEmpty(v)).map(([k]) => k);
        if (missing.length) return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });
        if (!Array.isArray(invoices) || invoices.length === 0) return res.status(400).json({ success: false, message: 'At least one invoice is required' });

        if (!(await existsVehicle(vehicle_registration_number))) return res.status(400).json({ success: false, message: 'Invalid vehicle registration number' });
        if (!(await existsProduct(product_name))) return res.status(400).json({ success: false, message: 'Invalid product name' });
        const fromPlaceAliases = getFromPlaceAliasesForPrefix(login_prefix);

        if (!isCommissioned && !driver_name) return res.status(400).json({ success: false, message: 'Driver name is required' });
        const commission_pct = isCommissioned ? 6 : 0;
        const parsedDriverBata = Number(driver_bata) || 0;
        const parsedUnloadingRate = Number(unloading) || 0;
        const parsedTarpaulin = (String(vehicle_body_type || '').toLowerCase().includes('container')) ? 0 : (Number(tarpaulin) || 0);
        const parsedCityTax = Number(city_tax) || 0;
        const parsedMaintenance = Number(maintenance) || 0;


        let parsedFuelRate = 0, parsedFuelLitre = 0, fuel_amount = 0;
        if (pump_name) {
            const pumpRes = await client.query('SELECT rate FROM pumps WHERE pump_name = $1', [pump_name]);
            if (pumpRes.rows.length === 0 && !isDedicated) return res.status(400).json({ success: false, message: 'Invalid pump selection' });
            const pumpRate = pumpRes.rows.length > 0 ? Number(pumpRes.rows[0].rate) : 0;
            parsedFuelRate = Number(fuel_rate) || pumpRate || 0;
            parsedFuelLitre = Number(fuel_litre) || 0;
            fuel_amount = parsedFuelLitre * parsedFuelRate;
        } else if (!isDedicated) {
            return res.status(400).json({ success: false, message: 'Invalid pump selection' });
        }

        const seen = new Set();
        const invoiceRows = [];
        for (const inv of invoices) {
            const invoice_number = inv.invoice_number;
            const to_place = inv.to_place;
            const place_id = inv.place_id;
            const dealer_name = inv.dealer_name;
            const quantity = inv.quantity;
            const kt_freight = inv.kt_freight;
            if (!invoice_number || !to_place || !dealer_name || !quantity || !kt_freight) {
                return res.status(400).json({ success: false, message: 'Invoice fields are missing' });
            }
            if (seen.has(invoice_number)) return res.status(400).json({ success: false, message: 'Duplicate invoice number' });
            seen.add(invoice_number);
            const place = place_id
                ? await findPlaceByIdAndProduct(place_id, product_name, fromPlaceAliases)
                : await findPlaceByNameAndProduct(to_place, product_name, fromPlaceAliases);
            if (!place) return res.status(400).json({ success: false, message: 'Invalid place for selected product and login branch' });
            const resolvedToPlace = place.to_place || to_place;
            if (!(await dealerExistsForToPlace(dealer_name, resolvedToPlace))) {
                return res.status(400).json({ success: false, message: 'Invalid dealer for selected To Place' });
            }
            const parsedQty = Number(quantity);
            const parsedKt = Number(kt_freight);
            const ifa_amount = Number.isFinite(parsedQty) && Number.isFinite(parsedKt) ? parsedQty * parsedKt : 0;
            invoiceRows.push({
                place_id: place.id,
                invoice_number,
                to_place: resolvedToPlace,
                dealer_name,
                kt_freight: parsedKt || 0,
                quantity: parsedQty || 0,
                ifa_amount
            });
        }

        const parsedDriverLoadingAdvance = Number(driver_loading_advance) || 0;
        const parsedUnloading = parsedUnloadingRate * parsedDriverLoadingAdvance;
        const sum_ifas = invoiceRows.reduce((s, r) => s + (Number(r.ifa_amount) || 0), 0);
        const commission_amount = isCommissioned ? (sum_ifas * commission_pct) / 100 : 0;
        const expenseSum = parsedDriverBata + parsedUnloading + parsedTarpaulin + parsedCityTax + parsedMaintenance;
        const predefined_expenses = commission_amount + parsedUnloading + parsedTarpaulin + parsedCityTax + parsedMaintenance;
        const gross_amount = isCommissioned ? (commission_amount - expenseSum) : (sum_ifas - expenseSum);
        const parsedTds = Number(tds) || 0;
        const trip_balance = sum_ifas - (commission_amount + parsedDriverLoadingAdvance + (parsedFuelLitre * parsedFuelRate) + parsedTds);

        const voucher_number = await buildVoucherNumber(login_prefix);
        const firstInv = invoiceRows[0];
        await client.query('BEGIN');
        const insertMain = `
            INSERT INTO loading_advances
            (voucher_number, vehicle_registration_number, vehicle_type, vehicle_sub_type, vehicle_body_type, owner_name, owner_type, product_name, invoice_number, to_place, dealer_name, kt_freight, quantity, ifa_amount, sum_ifas, driver_bata, unloading, tarpaulin, city_tax, maintenance, pump_name, fuel_litre, fuel_rate, fuel_amount, driver_name, driver_loading_advance, trip_balance, commission_pct, predefined_expenses, invoice_date, tds)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
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
            isDedicated ? (driver_name || null) : (isCommissioned ? null : driver_name),
            parsedDriverLoadingAdvance,
            trip_balance,
            commission_pct,
            predefined_expenses,
            invoice_date,
            parsedTds
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

        const placeRateCardUpdates = new Map();
        for (const inv of invoiceRows) {
            if (!inv.place_id) continue;
            placeRateCardUpdates.set(inv.place_id, {
                place_id: inv.place_id,
                vehicle_type,
                vehicle_sub_type,
                vehicle_body_type,
                kt_freight: inv.kt_freight,
                driver_bata: parsedDriverBata,
                advance: parsedDriverLoadingAdvance,
                unloading: parsedUnloadingRate,
                tarpaulin: parsedTarpaulin,
                city_tax: parsedCityTax,
                maintenance: parsedMaintenance
            });
        }

        for (const rateCardUpdate of placeRateCardUpdates.values()) {
            await upsertPlaceRateCardFromTransaction(client, rateCardUpdate);
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

const deleteLoadingAdvance = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM loading_advances WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Loading advance not found' });
        }
        res.status(200).json({ success: true, message: 'Loading advance deleted successfully' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: 'Cannot delete: this record is linked to a settlement. Remove the settlement first.' });
        }
        next(error);
    }
};

module.exports = { getAllLoadingAdvances, getLoadingAdvanceById, createLoadingAdvance, getNextVoucher, getLoadingAdvanceInvoices, deleteLoadingAdvance };
