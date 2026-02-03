const pool = require('../config/database');

class PumpModel {
    static async create(pumpData) {
        const {
            pump_name, rate, contact_person, contact_no, email_id,
            company_address_1, company_address_2, place, pan_no, gst_no,
            bank_name, branch, account_number, ifsc_code
        } = pumpData;

        const query = `
            INSERT INTO pumps (
                pump_name, rate, contact_person, contact_no, email_id,
                company_address_1, company_address_2, place, pan_no, gst_no,
                bank_name, branch, account_number, ifsc_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            pump_name, rate, contact_person, contact_no || null, email_id,
            company_address_1, company_address_2 || null, place, pan_no, gst_no,
            bank_name, branch, account_number, ifsc_code
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findAll() {
        const query = 'SELECT * FROM pumps ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM pumps WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, pumpData) {
        const {
            rate, contact_person, contact_no, email_id,
            company_address_1, company_address_2, place,
            bank_name, branch, account_number, ifsc_code
        } = pumpData;

        const query = `
            UPDATE pumps 
            SET 
                rate = $1, contact_person = $2, contact_no = $3, email_id = $4,
                company_address_1 = $5, company_address_2 = $6, place = $7,
                bank_name = $8, branch = $9, account_number = $10, ifsc_code = $11
            WHERE id = $12
            RETURNING *
        `;

        const values = [
            rate, contact_person, contact_no || null, email_id,
            company_address_1, company_address_2 || null, place,
            bank_name, branch, account_number, ifsc_code, id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM pumps WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = PumpModel;
