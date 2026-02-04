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
        const { name, mobile, address, pan_no, aadhar_no, bank_name, branch, ifsc_code, account_no, status } = req.body;
        const result = await pool.query(
            'INSERT INTO owners (name, mobile, address, pan_no, aadhar_no, bank_name, branch, ifsc_code, account_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, mobile, address, pan_no, aadhar_no, bank_name, branch, ifsc_code, account_no, status]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, mobile, address, pan_no, aadhar_no, bank_name, branch, ifsc_code, account_no, status } = req.body;
        const result = await pool.query(
            'UPDATE owners SET name=$2, mobile=$3, address=$4, pan_no=$5, aadhar_no=$6, bank_name=$7, branch=$8, ifsc_code=$9, account_no=$10, status=$11, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',
            [id, name, mobile, address, pan_no, aadhar_no, bank_name, branch, ifsc_code, account_no, status]
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
