const pool = require('../config/database');

const statuses = new Set(['Acknowledged', 'Shortage', 'Pending']);
const nearlyEqual = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

const getAllAcknowledgements = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT a.id, a.loading_advance_id, a.voucher_number, a.voucher_status, a.voucher_pending_amount, a.created_at,
                    la.vehicle_registration_number, la.voucher_datetime
             FROM acknowledgements a
             JOIN loading_advances la ON la.id = a.loading_advance_id
             ORDER BY a.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const createAcknowledgement = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const { loading_advance_id, items = [] } = req.body;
        if (!loading_advance_id) return res.status(400).json({ success: false, message: 'loading_advance_id is required' });
        if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'At least one invoice is required' });

        const laRes = await client.query('SELECT id, voucher_number, trip_balance FROM loading_advances WHERE id = $1', [loading_advance_id]);
        if (laRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid voucher selection' });
        const exists = await client.query('SELECT 1 FROM acknowledgements WHERE loading_advance_id = $1', [loading_advance_id]);
        if (exists.rows.length) return res.status(400).json({ success: false, message: 'Acknowledgement already exists for this voucher' });

        const invRes = await client.query(
            'SELECT id, invoice_number, to_place, quantity, ifa_amount FROM loading_advance_invoices WHERE loading_advance_id = $1 ORDER BY id',
            [loading_advance_id]
        );
        if (invRes.rows.length === 0) return res.status(400).json({ success: false, message: 'No invoices found for this voucher' });
        const invMap = new Map(invRes.rows.map(r => [String(r.id), r]));

        const seen = new Set();
        const rows = [];
        for (const item of items) {
            const invId = String(item.loading_advance_invoice_id || item.invoice_id || '');
            const status = item.status;
            const returned = Number(item.returned_amount || 0);
            if (!invMap.has(invId)) return res.status(400).json({ success: false, message: 'Invalid invoice selection' });
            if (seen.has(invId)) return res.status(400).json({ success: false, message: 'Duplicate invoice selection' });
            if (!statuses.has(status)) return res.status(400).json({ success: false, message: 'Invalid acknowledgement status' });
            const inv = invMap.get(invId);
            const ifa = Number(inv.ifa_amount || 0);
            if (status === 'Acknowledged' && !nearlyEqual(returned, ifa)) return res.status(400).json({ success: false, message: `Returned amount must equal IFA for invoice ${inv.invoice_number}` });
            if (status === 'Shortage' && !(returned > 0 && returned < ifa)) return res.status(400).json({ success: false, message: `Returned amount must be less than IFA for invoice ${inv.invoice_number}` });
            if (status === 'Pending' && returned !== 0) return res.status(400).json({ success: false, message: `Returned amount must be 0 for invoice ${inv.invoice_number}` });
            rows.push({ ...inv, status, returned_amount: returned });
            seen.add(invId);
        }
        if (seen.size !== invMap.size) return res.status(400).json({ success: false, message: 'All invoices must be acknowledged' });

        const tripBalance = Number(laRes.rows[0].trip_balance || 0);
        const totalReturned = rows.reduce((s, r) => s + (Number(r.returned_amount) || 0), 0);
        const voucher_pending_amount = tripBalance - totalReturned;
        if (voucher_pending_amount < 0) return res.status(400).json({ success: false, message: 'Total returned exceeds trip balance' });
        const voucher_status = rows.every(r => r.status === 'Acknowledged') ? 'Settled' : 'Pending';

        await client.query('BEGIN');
        inTx = true;
        const ackRes = await client.query(
            `INSERT INTO acknowledgements (loading_advance_id, voucher_number, voucher_status, voucher_pending_amount)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [loading_advance_id, laRes.rows[0].voucher_number, voucher_status, voucher_pending_amount]
        );
        const ackId = ackRes.rows[0].id;
        const insert = `INSERT INTO acknowledgement_invoices
            (acknowledgement_id, loading_advance_invoice_id, invoice_number, to_place, quantity, ifa_amount, status, returned_amount)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
        for (const r of rows) {
            await client.query(insert, [ackId, r.id, r.invoice_number, r.to_place, r.quantity, r.ifa_amount, r.status, r.returned_amount]);
        }
        await client.query('COMMIT');
        res.status(201).json({ success: true, data: ackRes.rows[0] });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally { client.release(); }
};

module.exports = { getAllAcknowledgements, createAcknowledgement };
