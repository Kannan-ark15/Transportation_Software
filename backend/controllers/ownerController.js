const pool = require('../config/database');

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
        const { owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status } = req.body;
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
        const { owner_name, owner_type, pan_no, aadhar_no, gst_no, company_address, place, contact_no, email_id, bank_name, branch, ifsc_code, account_no, status } = req.body;
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
