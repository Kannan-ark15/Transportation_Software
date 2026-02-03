const pool = require('../config/database');

class ProductModel {
    static async create(productData) {
        const { product_name, measuring_unit } = productData;
        const query = `
            INSERT INTO products (product_name, measuring_unit)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await pool.query(query, [product_name, measuring_unit]);
        return result.rows[0];
    }

    static async findAll() {
        const query = 'SELECT * FROM products ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM products WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, productData) {
        const { product_name, measuring_unit } = productData;
        const query = `
            UPDATE products 
            SET product_name = $1, measuring_unit = $2
            WHERE id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [product_name, measuring_unit, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async existsByName(product_name, excludeId = null) {
        let query = 'SELECT id FROM products WHERE product_name = $1';
        const values = [product_name];
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }
}

module.exports = ProductModel;
