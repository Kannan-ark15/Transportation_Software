const pool = require('../config/database');

const statuses = new Set(['Acknowledged', 'Shortage', 'Pending']);
const nearlyEqual = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const buildAcknowledgementNumber = (invoiceNumber = '') =>
    `ACK${String(invoiceNumber).replace(/\s+/g, '')}`;
const today = () => new Date().toISOString().split('T')[0];
const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
const toDateOnly = (value) => {
    if (!value) return today();
    if (typeof value === 'string') return value.split('T')[0];
    return new Date(value).toISOString().split('T')[0];
};

const parseRunMetrics = (source, last_odometer, current_odometer) => {
    const hasLastOdometer = !isBlank(last_odometer);
    const hasCurrentOdometer = !isBlank(current_odometer);
    if (hasLastOdometer !== hasCurrentOdometer) {
        return { error: 'Both last_odometer and current_odometer are required together' };
    }

    let parsedLastOdometer = null;
    let parsedCurrentOdometer = null;
    let runKms = null;
    let mileage = null;

    if (hasLastOdometer && hasCurrentOdometer) {
        parsedLastOdometer = Number(last_odometer);
        parsedCurrentOdometer = Number(current_odometer);
        if (!Number.isFinite(parsedLastOdometer) || !Number.isFinite(parsedCurrentOdometer)) {
            return { error: 'Odometer values must be valid numbers' };
        }
        if (parsedLastOdometer < 0 || parsedCurrentOdometer < 0) {
            return { error: 'Odometer values cannot be negative' };
        }
        if (parsedCurrentOdometer < parsedLastOdometer) {
            return { error: 'Current odometer must be greater than or equal to last odometer' };
        }

        const parsedFuelLitre = Number(source.fuel_litre) || 0;
        runKms = Number((parsedCurrentOdometer - parsedLastOdometer).toFixed(3));
        mileage = Number((parsedFuelLitre > 0 ? (runKms / parsedFuelLitre) : 0).toFixed(3));
    }

    return { parsedLastOdometer, parsedCurrentOdometer, runKms, mileage };
};

const loadAcknowledgementDetail = async (db, id) => {
    const ackRes = await db.query(
        `SELECT a.id, a.loading_advance_id, a.voucher_number, a.voucher_status, a.voucher_pending_amount,
                a.last_odometer, a.current_odometer, a.run_kms, a.mileage, a.created_at, a.updated_at,
                la.vehicle_registration_number, la.voucher_datetime, la.invoice_date, la.fuel_litre
         FROM acknowledgements a
         JOIN loading_advances la ON la.id = a.loading_advance_id
         WHERE a.id = $1`,
        [id]
    );
    if (ackRes.rows.length === 0) return null;

    const invoiceRes = await db.query(
        `SELECT id, loading_advance_invoice_id, invoice_number, dealer_name, to_place, quantity, ifa_amount,
                status, returned_amount, acknowledgement_number, acknowledgement_date
         FROM acknowledgement_invoices
         WHERE acknowledgement_id = $1
         ORDER BY id`,
        [id]
    );

    return { ...ackRes.rows[0], invoices: invoiceRes.rows };
};

const buildAcknowledgementRows = async (client, loadingAdvanceId, items, existingRowsByInvoiceId = new Map()) => {
    if (!Array.isArray(items) || items.length === 0) {
        return { error: 'At least one invoice is required' };
    }

    const invRes = await client.query(
        'SELECT id, invoice_number, dealer_name, to_place, quantity, ifa_amount FROM loading_advance_invoices WHERE loading_advance_id = $1 ORDER BY id',
        [loadingAdvanceId]
    );
    if (invRes.rows.length === 0) return { error: 'No invoices found for this voucher' };

    const invMap = new Map(invRes.rows.map(r => [String(r.id), r]));
    const seen = new Set();
    const rows = [];

    for (const item of items) {
        const invId = String(item.loading_advance_invoice_id || item.invoice_id || '');
        const status = item.status;
        const returned = Number(item.returned_amount || 0);
        if (!invMap.has(invId)) return { error: 'Invalid invoice selection' };
        if (seen.has(invId)) return { error: 'Duplicate invoice selection' };
        if (!statuses.has(status)) return { error: 'Invalid acknowledgement status' };

        const inv = invMap.get(invId);
        const ifa = Number(inv.ifa_amount || 0);
        if (status === 'Acknowledged' && !nearlyEqual(returned, ifa)) {
            return { error: `Returned amount must equal IFA for invoice ${inv.invoice_number}` };
        }
        if (status === 'Shortage' && !(returned > 0 && returned < ifa)) {
            return { error: `Returned amount must be less than IFA for invoice ${inv.invoice_number}` };
        }
        if (status === 'Pending' && returned !== 0) {
            return { error: `Returned amount must be 0 for invoice ${inv.invoice_number}` };
        }

        const existing = existingRowsByInvoiceId.get(invId);
        const existingReturned = Number(existing?.returned_amount || 0);
        const changed = !existing || existing.status !== status || !nearlyEqual(existingReturned, returned);

        rows.push({
            ...inv,
            status,
            returned_amount: returned,
            acknowledgement_number: existing?.acknowledgement_number || buildAcknowledgementNumber(inv.invoice_number),
            acknowledgement_date: changed ? today() : toDateOnly(existing.acknowledgement_date)
        });
        seen.add(invId);
    }

    if (seen.size !== invMap.size) return { error: 'All invoices must be acknowledged' };

    const totalIfa = rows.reduce((sum, row) => sum + (Number(row.ifa_amount) || 0), 0);
    const totalReturned = rows.reduce((sum, row) => sum + (Number(row.returned_amount) || 0), 0);
    const voucherPendingAmount = Number((totalIfa - totalReturned).toFixed(2));
    if (voucherPendingAmount < 0) return { error: 'Total returned exceeds total IFA' };

    const isVoucherAcknowledged = rows.every(row => row.status !== 'Pending');
    return {
        rows,
        voucherPendingAmount,
        voucherStatus: isVoucherAcknowledged && voucherPendingAmount > 0 ? 'Ready for Settlement' : 'Pending'
    };
};

const isAcknowledgementLinkedToSettlement = async (client, id) => {
    const result = await client.query(
        `SELECT EXISTS (
            SELECT 1 FROM dedicated_market_settlement_vouchers WHERE acknowledgement_id = $1
            UNION ALL
            SELECT 1 FROM own_vehicle_settlement_vouchers WHERE acknowledgement_id = $1
        ) AS linked`,
        [id]
    );
    return !!result.rows[0]?.linked;
};

const getAllAcknowledgements = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT a.id, a.loading_advance_id, a.voucher_number, a.voucher_status, a.voucher_pending_amount,
                    a.last_odometer, a.current_odometer, a.run_kms, a.mileage, a.created_at,
                    la.vehicle_registration_number, la.voucher_datetime,
                    COALESCE(
                        (
                            SELECT string_agg(ai.invoice_number, ', ' ORDER BY ai.invoice_number)
                            FROM acknowledgement_invoices ai
                            WHERE ai.acknowledgement_id = a.id
                                AND ai.status IN ('Pending', 'Shortage')
                        ),
                        ''
                    ) AS pending_shortage_invoice_numbers
             FROM acknowledgements a
             JOIN loading_advances la ON la.id = a.loading_advance_id
             ORDER BY a.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getAcknowledgementById = async (req, res, next) => {
    try {
        const detail = await loadAcknowledgementDetail(pool, req.params.id);
        if (!detail) return res.status(404).json({ success: false, message: 'Acknowledgement not found' });
        res.status(200).json({ success: true, data: detail });
    } catch (error) { next(error); }
};

const createAcknowledgement = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const { loading_advance_id, items = [], last_odometer, current_odometer } = req.body;
        if (!loading_advance_id) return res.status(400).json({ success: false, message: 'loading_advance_id is required' });

        const laRes = await client.query('SELECT id, voucher_number, fuel_litre FROM loading_advances WHERE id = $1', [loading_advance_id]);
        if (laRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid voucher selection' });
        const exists = await client.query('SELECT 1 FROM acknowledgements WHERE loading_advance_id = $1', [loading_advance_id]);
        if (exists.rows.length) return res.status(400).json({ success: false, message: 'Acknowledgement already exists for this voucher' });

        const metrics = parseRunMetrics(laRes.rows[0], last_odometer, current_odometer);
        if (metrics.error) return res.status(400).json({ success: false, message: metrics.error });

        const built = await buildAcknowledgementRows(client, loading_advance_id, items);
        if (built.error) return res.status(400).json({ success: false, message: built.error });

        await client.query('BEGIN');
        inTx = true;
        const ackRes = await client.query(
            `INSERT INTO acknowledgements
                (loading_advance_id, voucher_number, voucher_status, voucher_pending_amount, last_odometer, current_odometer, run_kms, mileage)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [
                loading_advance_id,
                laRes.rows[0].voucher_number,
                built.voucherStatus,
                built.voucherPendingAmount,
                metrics.parsedLastOdometer,
                metrics.parsedCurrentOdometer,
                metrics.runKms,
                metrics.mileage
            ]
        );
        const ackId = ackRes.rows[0].id;
        const insert = `INSERT INTO acknowledgement_invoices
            (acknowledgement_id, loading_advance_invoice_id, invoice_number, dealer_name, to_place, quantity, ifa_amount, status, returned_amount, acknowledgement_number, acknowledgement_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
        for (const row of built.rows) {
            await client.query(insert, [
                ackId, row.id, row.invoice_number, row.dealer_name, row.to_place, row.quantity, row.ifa_amount,
                row.status, row.returned_amount, row.acknowledgement_number, row.acknowledgement_date
            ]);
        }
        await client.query('COMMIT');
        res.status(201).json({ success: true, data: ackRes.rows[0] });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally { client.release(); }
};

const updateAcknowledgement = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const id = Number(req.params.id);
        const { items = [], last_odometer, current_odometer, loading_advance_id } = req.body;
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid acknowledgement id' });

        const ackRes = await client.query(
            `SELECT a.*, la.fuel_litre
             FROM acknowledgements a
             JOIN loading_advances la ON la.id = a.loading_advance_id
             WHERE a.id = $1`,
            [id]
        );
        if (ackRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Acknowledgement not found' });
        const acknowledgement = ackRes.rows[0];

        if (loading_advance_id && Number(loading_advance_id) !== Number(acknowledgement.loading_advance_id)) {
            return res.status(400).json({ success: false, message: 'Voucher cannot be changed while editing acknowledgement' });
        }
        if (await isAcknowledgementLinkedToSettlement(client, id)) {
            return res.status(400).json({ success: false, message: 'Cannot edit acknowledgement after it is linked to a settlement' });
        }

        const metrics = parseRunMetrics(acknowledgement, last_odometer, current_odometer);
        if (metrics.error) return res.status(400).json({ success: false, message: metrics.error });

        const existingRows = await client.query(
            'SELECT loading_advance_invoice_id, status, returned_amount, acknowledgement_number, acknowledgement_date FROM acknowledgement_invoices WHERE acknowledgement_id = $1',
            [id]
        );
        const existingRowsByInvoiceId = new Map(existingRows.rows.map(row => [String(row.loading_advance_invoice_id), row]));

        const built = await buildAcknowledgementRows(client, acknowledgement.loading_advance_id, items, existingRowsByInvoiceId);
        if (built.error) return res.status(400).json({ success: false, message: built.error });

        await client.query('BEGIN');
        inTx = true;
        const updatedAck = await client.query(
            `UPDATE acknowledgements
             SET voucher_status = $2,
                 voucher_pending_amount = $3,
                 last_odometer = $4,
                 current_odometer = $5,
                 run_kms = $6,
                 mileage = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [
                id,
                built.voucherStatus,
                built.voucherPendingAmount,
                metrics.parsedLastOdometer,
                metrics.parsedCurrentOdometer,
                metrics.runKms,
                metrics.mileage
            ]
        );

        const updateInvoice = `UPDATE acknowledgement_invoices
            SET status = $3,
                returned_amount = $4,
                acknowledgement_number = $5,
                acknowledgement_date = $6
            WHERE acknowledgement_id = $1
              AND loading_advance_invoice_id = $2`;
        const insertInvoice = `INSERT INTO acknowledgement_invoices
            (acknowledgement_id, loading_advance_invoice_id, invoice_number, dealer_name, to_place, quantity, ifa_amount, status, returned_amount, acknowledgement_number, acknowledgement_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

        for (const row of built.rows) {
            const result = await client.query(updateInvoice, [
                id,
                row.id,
                row.status,
                row.returned_amount,
                row.acknowledgement_number,
                row.acknowledgement_date
            ]);
            if (result.rowCount === 0) {
                await client.query(insertInvoice, [
                    id, row.id, row.invoice_number, row.dealer_name, row.to_place, row.quantity, row.ifa_amount,
                    row.status, row.returned_amount, row.acknowledgement_number, row.acknowledgement_date
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, data: updatedAck.rows[0] });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally { client.release(); }
};

module.exports = { getAllAcknowledgements, getAcknowledgementById, createAcknowledgement, updateAcknowledgement };