const pool = require('../config/database');

const entityConfig = {
    products: {
        table: 'station_products',
        id: 'product_id',
        fields: ['product_name', 'product_code', 'status'],
        orderBy: 'created_at DESC',
        required: ['product_name', 'product_code'],
        duplicateMessage: 'Station product code already exists'
    },
    tanks: {
        table: 'station_tanks',
        id: 'tank_id',
        fields: ['tank_id', 'product_code', 'capacity', 'product_id', 'status'],
        orderBy: 'created_at DESC',
        required: ['tank_id', 'product_code', 'capacity']
    },
    dispensers: {
        table: 'station_dispensers',
        id: 'dispenser_id',
        fields: ['dispenser_no', 'status'],
        orderBy: 'created_at DESC',
        required: ['dispenser_no'],
        duplicateMessage: 'Dispenser number already exists'
    },
    nozzles: {
        table: 'station_nozzles',
        id: 'nozzle_id',
        fields: ['nozzle_id', 'dispenser_no', 'tank_id', 'product_code', 'status'],
        orderBy: 'created_at DESC',
        required: ['nozzle_id', 'dispenser_no', 'tank_id', 'product_code']
    },
    rates: {
        table: 'station_rates',
        id: 'rate_id',
        fields: ['effective_date', 'product_code', 'rate'],
        orderBy: 'effective_date DESC, created_at DESC',
        required: ['effective_date', 'product_code', 'rate'],
        duplicateMessage: 'Rate already exists for this product and date'
    }
};

const getConfig = (entity) => entityConfig[entity];

const pickFields = (config, body, includeId = true) => {
    const fields = includeId ? config.fields : config.fields.filter((field) => field !== config.id);
    return fields.reduce((acc, field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            acc[field] = body[field] === '' ? null : body[field];
        }
        return acc;
    }, {});
};

const ensureRequired = (config, data) => {
    const missing = config.required.filter((field) => data[field] === undefined || data[field] === null || data[field] === '');
    if (missing.length > 0) {
        const error = new Error(`Missing required fields: ${missing.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }
};

const normalizeStationData = async (entity, data) => {
    if (entity === 'products' && data.product_code) {
        data.product_code = String(data.product_code).trim().toUpperCase();
    }

    if (entity === 'tanks') {
        if (data.tank_id) data.tank_id = String(data.tank_id).trim().toUpperCase();
        if (data.product_code) data.product_code = String(data.product_code).trim().toUpperCase();
        if (data.product_code && !data.product_id) {
            const product = await pool.query(
                'SELECT product_id FROM station_products WHERE product_code = $1',
                [data.product_code]
            );
            data.product_id = product.rows[0]?.product_id;
        }
    }

    if (entity === 'dispensers' && data.dispenser_no) {
        data.dispenser_no = String(data.dispenser_no).trim().toUpperCase();
    }

    if (entity === 'nozzles') {
        if (data.nozzle_id) data.nozzle_id = String(data.nozzle_id).trim().toUpperCase();
        if (data.dispenser_no) data.dispenser_no = String(data.dispenser_no).trim().toUpperCase();
        if (data.tank_id) data.tank_id = String(data.tank_id).trim().toUpperCase();
        if (data.product_code) data.product_code = String(data.product_code).trim().toUpperCase();
    }

    if (entity === 'rates' && data.product_code) {
        data.product_code = String(data.product_code).trim().toUpperCase();
    }

    return data;
};

const handleDbError = (res, error, fallbackMessage) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }

    if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Duplicate station record' });
    }

    if (error.code === '23503' || error.code === '23502') {
        return res.status(400).json({ success: false, message: 'Referenced station record was not found or required data is missing' });
    }

    console.error(fallbackMessage, error);
    return res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

class StationController {
    static async getAll(req, res) {
        const { entity } = req.params;
        const config = getConfig(entity);
        if (!config) return res.status(404).json({ success: false, message: 'Station entity not found' });

        try {
            const result = await pool.query(`SELECT * FROM ${config.table} ORDER BY ${config.orderBy}`);
            return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
        } catch (error) {
            return handleDbError(res, error, `Error fetching station ${entity}`);
        }
    }

    static async getById(req, res) {
        const { entity, id } = req.params;
        const config = getConfig(entity);
        if (!config) return res.status(404).json({ success: false, message: 'Station entity not found' });

        try {
            const result = await pool.query(`SELECT * FROM ${config.table} WHERE ${config.id} = $1`, [id]);
            if (!result.rows[0]) {
                return res.status(404).json({ success: false, message: 'Station record not found' });
            }
            return res.status(200).json({ success: true, data: result.rows[0] });
        } catch (error) {
            return handleDbError(res, error, `Error fetching station ${entity}`);
        }
    }

    static async create(req, res) {
        const { entity } = req.params;
        const config = getConfig(entity);
        if (!config) return res.status(404).json({ success: false, message: 'Station entity not found' });

        try {
            const data = await normalizeStationData(entity, pickFields(config, req.body));
            ensureRequired(config, data);

            const fields = Object.keys(data);
            const placeholders = fields.map((_, index) => `$${index + 1}`);
            const values = fields.map((field) => data[field]);
            const query = `
                INSERT INTO ${config.table} (${fields.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *
            `;
            const result = await pool.query(query, values);
            return res.status(201).json({ success: true, message: 'Station record created successfully', data: result.rows[0] });
        } catch (error) {
            if (error.code === '23505' && config.duplicateMessage) {
                return res.status(400).json({ success: false, message: config.duplicateMessage });
            }
            return handleDbError(res, error, `Error creating station ${entity}`);
        }
    }

    static async update(req, res) {
        const { entity, id } = req.params;
        const config = getConfig(entity);
        if (!config) return res.status(404).json({ success: false, message: 'Station entity not found' });

        try {
            const data = await normalizeStationData(entity, pickFields(config, req.body, false));
            const fields = Object.keys(data);
            if (fields.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields provided for update' });
            }

            const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
            const values = fields.map((field) => data[field]);
            values.push(id);

            const result = await pool.query(
                `UPDATE ${config.table} SET ${setClause} WHERE ${config.id} = $${values.length} RETURNING *`,
                values
            );

            if (!result.rows[0]) {
                return res.status(404).json({ success: false, message: 'Station record not found' });
            }

            return res.status(200).json({ success: true, message: 'Station record updated successfully', data: result.rows[0] });
        } catch (error) {
            if (error.code === '23505' && config.duplicateMessage) {
                return res.status(400).json({ success: false, message: config.duplicateMessage });
            }
            return handleDbError(res, error, `Error updating station ${entity}`);
        }
    }

    static async updateStatus(req, res) {
        const { entity, id } = req.params;
        const config = getConfig(entity);
        if (!config || !config.fields.includes('status')) {
            return res.status(404).json({ success: false, message: 'Station status endpoint not found' });
        }

        try {
            const { status } = req.body;
            if (typeof status !== 'boolean') {
                return res.status(400).json({ success: false, message: 'Status must be true or false' });
            }

            const result = await pool.query(
                `UPDATE ${config.table} SET status = $1 WHERE ${config.id} = $2 RETURNING *`,
                [status, id]
            );

            if (!result.rows[0]) {
                return res.status(404).json({ success: false, message: 'Station record not found' });
            }

            return res.status(200).json({ success: true, message: 'Station status updated successfully', data: result.rows[0] });
        } catch (error) {
            return handleDbError(res, error, `Error updating station ${entity} status`);
        }
    }

    static async delete(req, res) {
        const { entity, id } = req.params;
        const config = getConfig(entity);
        if (!config) return res.status(404).json({ success: false, message: 'Station entity not found' });

        try {
            const result = await pool.query(`DELETE FROM ${config.table} WHERE ${config.id} = $1 RETURNING *`, [id]);
            if (!result.rows[0]) {
                return res.status(404).json({ success: false, message: 'Station record not found' });
            }
            return res.status(200).json({ success: true, message: 'Station record deleted successfully' });
        } catch (error) {
            return handleDbError(res, error, `Error deleting station ${entity}`);
        }
    }

    static async getActiveRates(req, res) {
        try {
            const effectiveDate = req.query.date || new Date().toISOString().slice(0, 10);
            const result = await pool.query(
                `
                    SELECT DISTINCT ON (p.product_code)
                        p.product_id,
                        p.product_name,
                        p.product_code,
                        r.rate_id,
                        r.effective_date,
                        r.rate
                    FROM station_products p
                    LEFT JOIN station_rates r
                        ON r.product_code = p.product_code
                        AND r.effective_date <= $1::date
                    WHERE p.status = TRUE
                    ORDER BY p.product_code, r.effective_date DESC NULLS LAST
                `,
                [effectiveDate]
            );

            return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
        } catch (error) {
            return handleDbError(res, error, 'Error fetching active station rates');
        }
    }
}

module.exports = StationController;
