const pool = require('../config/database');

const CASH_BANK_OPTIONS = ['Cash', 'Bank'];

const toNumber = (value, fallback = NaN) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
};

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const DRIVER_TOTALS_CTE = `
    WITH driver_totals AS (
        SELECT
            d.id AS driver_id,
            COALESCE(adv.total_advance_given, 0)::DECIMAL(12,2) AS total_advance_given,
            COALESCE(rec.total_recovered, 0)::DECIMAL(12,2) AS total_recovered,
            GREATEST(COALESCE(adv.total_advance_given, 0) - COALESCE(rec.total_recovered, 0), 0)::DECIMAL(12,2) AS pending_advance
        FROM drivers d
        LEFT JOIN (
            SELECT
                da.driver_id,
                SUM(da.advance_amount) AS total_advance_given
            FROM driver_advances da
            GROUP BY da.driver_id
        ) adv ON adv.driver_id = d.id
        LEFT JOIN (
            SELECT
                da.driver_id,
                SUM(dar.recovered_amount) AS total_recovered
            FROM driver_advance_recoveries dar
            JOIN driver_advances da ON da.id = dar.driver_advance_id
            GROUP BY da.driver_id
        ) rec ON rec.driver_id = d.id
    )
`;

const DRIVER_ADVANCE_SELECT = `
    ${DRIVER_TOTALS_CTE}
    SELECT
        da.id,
        da.driver_id,
        d.driver_id AS driver_code,
        d.driver_name,
        da.advance_date,
        COALESCE(da.advance_amount, 0)::DECIMAL(12,2) AS advance_amount,
        da.cash_bank,
        da.remark,
        da.created_at,
        da.updated_at,
        COALESCE(dt.total_advance_given, 0)::DECIMAL(12,2) AS total_advance_given,
        COALESCE(dt.total_recovered, 0)::DECIMAL(12,2) AS total_recovered,
        COALESCE(dt.pending_advance, 0)::DECIMAL(12,2) AS pending_advance
    FROM driver_advances da
    JOIN drivers d ON d.id = da.driver_id
    LEFT JOIN driver_totals dt ON dt.driver_id = da.driver_id
`;

const getDriverAdvanceMeta = async (req, res, next) => {
    try {
        const result = await pool.query(`
            ${DRIVER_TOTALS_CTE}
            SELECT
                d.id,
                d.driver_id,
                d.driver_name,
                COALESCE(dt.total_advance_given, 0)::DECIMAL(12,2) AS total_advance_given,
                COALESCE(dt.total_recovered, 0)::DECIMAL(12,2) AS total_recovered,
                COALESCE(dt.pending_advance, 0)::DECIMAL(12,2) AS pending_advance
            FROM drivers d
            LEFT JOIN driver_totals dt ON dt.driver_id = d.id
            WHERE d.driver_status = TRUE
            ORDER BY d.driver_name ASC
        `);

        res.status(200).json({ success: true, data: { drivers: result.rows } });
    } catch (error) {
        next(error);
    }
};

const getAllDriverAdvances = async (req, res, next) => {
    try {
        const result = await pool.query(`
            ${DRIVER_ADVANCE_SELECT}
            ORDER BY da.advance_date DESC, da.id DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const getDriverAdvanceById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'Valid driver advance id is required' });
        }

        const result = await pool.query(
            `
                ${DRIVER_ADVANCE_SELECT}
                WHERE da.id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver advance not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

const createDriverAdvance = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;

    try {
        const {
            driver_id,
            advance_date,
            advance_amount,
            cash_bank,
            remark
        } = req.body || {};

        const driverId = Number(driver_id);
        if (!Number.isInteger(driverId) || driverId <= 0) {
            return res.status(400).json({ success: false, message: 'Valid driver is required' });
        }

        if (!advance_date) {
            return res.status(400).json({ success: false, message: 'Advance date is required' });
        }

        const parsedAmount = toNumber(advance_amount, NaN);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Advance amount must be greater than 0' });
        }

        if (!cash_bank || !CASH_BANK_OPTIONS.includes(cash_bank)) {
            return res.status(400).json({ success: false, message: 'Cash / Bank must be Cash or Bank' });
        }

        const advanceDateObj = new Date(`${advance_date}T00:00:00`);
        if (Number.isNaN(advanceDateObj.getTime())) {
            return res.status(400).json({ success: false, message: 'Advance date is invalid' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (advanceDateObj > today) {
            return res.status(400).json({
                success: false,
                message: `Advance date cannot be a future date. Use ${getTodayDateString()} or earlier.`
            });
        }

        const driverRes = await client.query(
            `SELECT id, driver_name
             FROM drivers
             WHERE id = $1
               AND driver_status = TRUE`,
            [driverId]
        );

        if (driverRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Selected driver is invalid or inactive' });
        }

        const driver = driverRes.rows[0];

        await client.query('BEGIN');
        inTx = true;

        const insertRes = await client.query(
            `INSERT INTO driver_advances
                (driver_id, driver_name, advance_date, advance_amount, cash_bank, remark)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                driver.id,
                driver.driver_name,
                advance_date,
                Number(parsedAmount.toFixed(2)),
                cash_bank,
                normalizeText(remark)
            ]
        );

        const insertedId = insertRes.rows[0].id;

        const detailRes = await client.query(
            `
                ${DRIVER_ADVANCE_SELECT}
                WHERE da.id = $1
            `,
            [insertedId]
        );

        await client.query('COMMIT');
        inTx = false;

        res.status(201).json({
            success: true,
            message: 'Driver advance added successfully',
            data: detailRes.rows[0]
        });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    getDriverAdvanceMeta,
    getAllDriverAdvances,
    getDriverAdvanceById,
    createDriverAdvance
};
