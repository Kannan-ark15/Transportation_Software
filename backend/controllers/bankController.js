const pool = require('../config/database');

const getAllBanks = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM banks ORDER BY id DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getBankById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM banks WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const createBank = async (req, res, next) => {
    try {
        const { bank_name, branch, ifsc_code, account_no, account_type, aadhar_no, pan_no, status } = req.body;
        const result = await pool.query(
            'INSERT INTO banks (bank_name, branch, ifsc_code, account_no, account_type, aadhar_no, pan_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [bank_name, branch, ifsc_code, account_no, account_type, aadhar_no, pan_no, status]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateBank = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bank_name, branch, ifsc_code, account_no, account_type, aadhar_no, pan_no, status } = req.body;
        const result = await pool.query(
            'UPDATE banks SET bank_name=$2, branch=$3, ifsc_code=$4, account_no=$5, account_type=$6, aadhar_no=$7, pan_no=$8, status=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',
            [id, bank_name, branch, ifsc_code, account_no, account_type, aadhar_no, pan_no, status]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteBank = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM banks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Bank not found' });
        res.status(200).json({ success: true, message: 'Bank deleted successfully' });
    } catch (error) { next(error); }
};

module.exports = { getAllBanks, getBankById, createBank, updateBank, deleteBank };
