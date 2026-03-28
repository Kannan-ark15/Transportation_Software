const pool = require('../config/database');

const isMarketOwnerType = (value) => String(value || '').trim().toLowerCase() === 'market';

const normalizeOwnerType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'own') return 'Own';
    if (normalized === 'dedicated') return 'Dedicated';
    if (normalized === 'market') return 'Market';

    return String(value || '').trim();
};

const normalizeOwnerPayload = (body = {}) => ({
    owner_name: String(body.owner_name || '').trim(),
    owner_type: normalizeOwnerType(body.owner_type),
    pan_no: String(body.pan_no || '').trim().toUpperCase(),
    aadhar_no: String(body.aadhar_no || '').trim(),
    gst_no: String(body.gst_no || '').trim().toUpperCase(),
    company_address: String(body.company_address || '').trim(),
    place: String(body.place || '').trim(),
    contact_no: String(body.contact_no || '').trim(),
    email_id: String(body.email_id || '').trim(),
    bank_name: String(body.bank_name || '').trim(),
    branch: String(body.branch || '').trim(),
    ifsc_code: String(body.ifsc_code || '').trim().toUpperCase(),
    account_no: String(body.account_no || '').trim(),
    status: String(body.status || 'Active').trim() || 'Active',
});

const validateOwnerPayload = (ownerData) => {
    const errors = [];
    const allowedOwnerTypes = ['Own', 'Dedicated', 'Market'];

    if (!ownerData.owner_type) errors.push('Owner type is required');
    else if (!allowedOwnerTypes.includes(ownerData.owner_type)) errors.push('Owner type must be Own, Dedicated, or Market');

    if (!ownerData.owner_name) errors.push('Owner name is required');
    if (!ownerData.bank_name) errors.push('Bank name is required');
    if (!ownerData.branch) errors.push('Branch is required');
    if (!ownerData.account_no) errors.push('Account number is required');
    if (!ownerData.ifsc_code) errors.push('IFSC code is required');

    if (!isMarketOwnerType(ownerData.owner_type)) {
        if (!ownerData.pan_no) errors.push('PAN number is required for Own and Dedicated owners');
        if (!ownerData.aadhar_no) errors.push('Aadhar number is required for Own and Dedicated owners');
        if (!ownerData.company_address) errors.push('Company address is required for Own and Dedicated owners');
        if (!ownerData.place) errors.push('Place is required for Own and Dedicated owners');
        if (!ownerData.contact_no) errors.push('Contact number is required for Own and Dedicated owners');
    }

    if (ownerData.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(ownerData.pan_no)) {
        errors.push('Invalid PAN format');
    }
    if (ownerData.aadhar_no && !/^\d{12}$/.test(ownerData.aadhar_no)) {
        errors.push('Aadhar number must be 12 digits');
    }
    if (ownerData.gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(ownerData.gst_no)) {
        errors.push('Invalid GST format');
    }
    if (ownerData.contact_no && !/^[6-9]\d{9}$/.test(ownerData.contact_no)) {
        errors.push('Invalid contact number');
    }
    if (ownerData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ownerData.ifsc_code)) {
        errors.push('Invalid IFSC format');
    }

    return errors;
};

const getAllOwners = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM owners ORDER BY id DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getOwnerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM owners WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Owner not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const createOwner = async (req, res, next) => {
    try {
        const ownerData = normalizeOwnerPayload(req.body);
        const validationErrors = validateOwnerPayload(ownerData);

        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });
        }

        const { owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status } = ownerData;
        const result = await pool.query(
            'INSERT INTO owners (owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
            [owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ownerData = normalizeOwnerPayload(req.body);
        const validationErrors = validateOwnerPayload(ownerData);

        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });
        }

        const { owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status } = ownerData;
        const result = await pool.query(
            'UPDATE owners SET owner_name=$2, owner_type=$3, pan_no=$4, aadhar_no=$5, gst_no=$6, company_address=$7, place=$8, contact_no=$9, email_id=$10, bank_name=$11, branch=$12, ifsc_code=$13, account_no=$14, status=$15, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',
            [id, owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Owner not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM owners WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Owner not found' });
        res.status(200).json({ success: true, message: 'Owner deleted successfully' });
    } catch (error) { next(error); }
};

module.exports = { getAllOwners, getOwnerById, createOwner, updateOwner, deleteOwner };
