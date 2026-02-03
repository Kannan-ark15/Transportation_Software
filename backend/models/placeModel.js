const pool = require('../config/database');

class PlaceModel {
    static async create(placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            INSERT INTO places (
                company_id, from_place, to_place, district, distance_km, product_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [company_id, from_place, to_place, district, distance_km, product_id]);
        return result.rows[0];
    }

    static async findAll() {
        // Joining with companies and products to get names
        const query = `
            SELECT p.*, c.company_name, pr.product_name 
            FROM places p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON p.product_id = pr.id
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT p.*, c.company_name, pr.product_name 
            FROM places p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON p.product_id = pr.id
            WHERE p.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            UPDATE places 
            SET company_id = $1, from_place = $2, to_place = $3, 
                district = $4, distance_km = $5, product_id = $6
            WHERE id = $7
            RETURNING *
        `;

        const result = await pool.query(query, [company_id, from_place, to_place, district, distance_km, product_id, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM places WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async existsCombination(to_place, product_id, excludeId = null) {
        let query = 'SELECT id FROM places WHERE to_place = $1 AND product_id = $2';
        const values = [to_place, product_id];
        if (excludeId) {
            query += ' AND id != $3';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }
}

module.exports = PlaceModel;
