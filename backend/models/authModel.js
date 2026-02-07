const pool = require('../config/database');

class AuthModel {
    static async createUser({ full_name, email, password_hash, password_salt }) {
        const query = `
            INSERT INTO login_users (full_name, email, password_hash, password_salt)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, email, is_active, created_at
        `;
        const result = await pool.query(query, [full_name || null, email, password_hash, password_salt]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const query = `
            SELECT id, full_name, email, password_hash, password_salt, is_active
            FROM login_users
            WHERE email = $1
        `;
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }
}

module.exports = AuthModel;
