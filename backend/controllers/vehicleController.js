const pool = require('../config/database');

const vehicleFields = [
    'vehicle_no', 'vehicle_type', 'vehicle_sub_type', 'vehicle_body_type', 'brand_name',
    'own_dedicated', 'owner_name', 'vehicle_financial_status', 'recommended_km', 'engine_no', 'chasis_no',
    'pollution_no', 'pollution_expiry_date', 'permit_no', 'permit_from_date',
    'permit_till_date', 'insurance_no', 'insurance_base_value', 'gst_percent', 'gst_value',
    'insurance_amount', 'fc_no', 'fc_from_date', 'fc_till_date', 'status'
];

const nullIfBlank = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }
    return value;
};

const normalizeOwnDedicated = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'own') return 'Own';
    if (normalized === 'dedicated') return 'Dedicated';
    if (normalized === 'market') return 'Market';
    return nullIfBlank(value);
};

const normalizeVehicleFinancialStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'loan') return 'Loan';
    return 'Free';
};

const normalizeVehicleStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'sold') return 'Sold';
    return 'Active';
};

const normalizeNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const isMarketVehicleEntry = (vehicleData) => {
    const ownerType = String(vehicleData.own_dedicated || '').trim().toLowerCase();
    const vehicleType = String(vehicleData.vehicle_type || '').trim().toLowerCase();
    return ownerType === 'market' || vehicleType === 'market';
};

const isDedicatedVehicleEntry = (vehicleData) => {
    return String(vehicleData.own_dedicated || '').trim().toLowerCase() === 'dedicated';
};

const isInsuranceRequired = (vehicleData) => {
    return !isMarketVehicleEntry(vehicleData) && !isDedicatedVehicleEntry(vehicleData);
};

const normalizeVehiclePayload = (body = {}) => {
    const normalized = {};

    vehicleFields.forEach((field) => {
        normalized[field] = nullIfBlank(body[field]);
    });

    normalized.vehicle_no = normalized.vehicle_no ? String(normalized.vehicle_no).toUpperCase() : null;
    normalized.own_dedicated = normalizeOwnDedicated(normalized.own_dedicated);
    normalized.vehicle_financial_status = normalizeVehicleFinancialStatus(normalized.vehicle_financial_status);
    normalized.status = normalizeVehicleStatus(normalized.status);

    normalized.recommended_km = normalizeNumber(normalized.recommended_km);
    normalized.insurance_base_value = normalizeNumber(normalized.insurance_base_value);
    normalized.gst_percent = normalizeNumber(normalized.gst_percent);
    normalized.gst_value = normalizeNumber(normalized.gst_value);
    normalized.insurance_amount = normalizeNumber(normalized.insurance_amount);

    if (normalized.insurance_base_value !== null && normalized.insurance_amount === null) {
        const gstPercent = normalized.gst_percent || 0;
        const gstValue = (normalized.insurance_base_value * gstPercent) / 100;
        normalized.gst_value = gstValue;
        normalized.insurance_amount = normalized.insurance_base_value + gstValue;
    }

    return normalized;
};

const validateVehiclePayload = (vehicleData) => {
    const errors = [];
    const isMarketVehicle = isMarketVehicleEntry(vehicleData);
    const nonMarketRequiredFields = [
        'vehicle_type',
        'vehicle_sub_type',
        'vehicle_body_type',
        'brand_name',
        'own_dedicated',
        'owner_name',
        'recommended_km'
    ];
    const insuranceRequiredFields = [
        'insurance_no',
        'insurance_base_value'
    ];

    if (!vehicleData.vehicle_no) {
        errors.push('Vehicle number is required');
    } else if (!/^[A-Z0-9]+$/.test(vehicleData.vehicle_no)) {
        errors.push('Vehicle number must be alphanumeric only (e.g. TN01AB1234)');
    }

    if (!isMarketVehicle) {
        const requiredFields = isInsuranceRequired(vehicleData)
            ? [...nonMarketRequiredFields, ...insuranceRequiredFields]
            : nonMarketRequiredFields;

        requiredFields.forEach((field) => {
            const value = vehicleData[field];
            const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
            if (isEmpty) {
                errors.push(`${field.replace(/_/g, ' ')} is required`);
            }
        });
    }

    return errors;
};

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
        const vehicleData = normalizeVehiclePayload(req.body);
        const validationErrors = validateVehiclePayload(vehicleData);

        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });
        }

        const placeholders = vehicleFields.map((_, i) => `$${i + 1}`).join(', ');
        const values = vehicleFields.map((field) => vehicleData[field]);
        const query = `INSERT INTO vehicles (${vehicleFields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await pool.query(query, values);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const vehicleData = normalizeVehiclePayload(req.body);
        const validationErrors = validateVehiclePayload(vehicleData);

        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });
        }

        const updates = vehicleFields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [id, ...vehicleFields.map((field) => vehicleData[field])];

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
