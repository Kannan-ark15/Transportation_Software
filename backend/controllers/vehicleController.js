const pool = require('../config/database');

const getAllVehicles = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles ORDER BY id DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getVehicleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const createVehicle = async (req, res, next) => {
    try {
        const fields = [
            'vehicle_no', 'vehicle_type', 'vehicle_sub_type', 'vehicle_body_type', 'brand_name',
            'own_dedicated', 'owner_name', 'recommended_km', 'engine_no', 'chasis_no',
            'rc_expiry_date', 'pollution_no', 'pollution_expiry_date', 'permit_no', 'permit_from_date',
            'permit_till_date', 'insurance_no', 'insurance_base_value', 'gst_percent', 'gst_value',
            'insurance_amount', 'fc_no', 'fc_from_date', 'fc_till_date', 'status'
        ];

        // Fix: Use ternary to allow 0 or false, only default to null if undefined/null/empty string
        const values = fields.map(field => {
            const val = req.body[field];
            return (val === undefined || val === null || val === '') ? null : val;
        });

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO vehicles (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await pool.query(query, values);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = [
            'vehicle_no', 'vehicle_type', 'vehicle_sub_type', 'vehicle_body_type', 'brand_name',
            'own_dedicated', 'owner_name', 'recommended_km', 'engine_no', 'chasis_no',
            'rc_expiry_date', 'pollution_no', 'pollution_expiry_date', 'permit_no', 'permit_from_date',
            'permit_till_date', 'insurance_no', 'insurance_base_value', 'gst_percent', 'gst_value',
            'insurance_amount', 'fc_no', 'fc_from_date', 'fc_till_date', 'status'
        ];

        const updates = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [id, ...fields.map(field => {
            const val = req.body[field];
            return (val === undefined || val === null || val === '') ? null : val;
        })];

        const query = `UPDATE vehicles SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) { next(error); }
};

module.exports = { getAllVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle };
