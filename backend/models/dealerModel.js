const pool = require('../config/database');

class DealerModel {
    static async create(dealerData) {
        const {
            place_id, district, dealer_name, gst_no, contact_no_1,
            contact_no_2, sales_area, sales_officer_no
        } = dealerData;

        const query = `
            INSERT INTO dealers (
                place_id, district, dealer_name, gst_no, contact_no_1, 
                contact_no_2, sales_area, sales_officer_no
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            place_id, district, dealer_name, gst_no, contact_no_1,
            contact_no_2 || null, sales_area, sales_officer_no
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findAll() {
        const query = `
            SELECT d.*, p.to_place as place_name 
            FROM dealers d
            JOIN places p ON d.place_id = p.id
            ORDER BY d.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT d.*, p.to_place as place_name 
            FROM dealers d
            JOIN places p ON d.place_id = p.id
            WHERE d.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, dealerData) {
        const {
            place_id, district, dealer_name, gst_no, contact_no_1,
            contact_no_2, sales_area, sales_officer_no
        } = dealerData;

        const query = `
            UPDATE dealers 
            SET place_id = $1, district = $2, dealer_name = $3, gst_no = $4,
                contact_no_1 = $5, contact_no_2 = $6, sales_area = $7, sales_officer_no = $8
            WHERE id = $9
            RETURNING *
        `;

        const values = [
            place_id, district, dealer_name, gst_no, contact_no_1,
            contact_no_2 || null, sales_area, sales_officer_no, id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM dealers WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async existsByGST(gst_no, excludeId = null) {
        let query = 'SELECT id FROM dealers WHERE gst_no = $1';
        const values = [gst_no];
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }
}

module.exports = DealerModel;
