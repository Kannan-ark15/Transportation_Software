const pool = require('../config/database');

class AuthModel {
    static async createUser({ full_name, email, password_hash, password_salt, login_prefix = 'HOF' }) {
        const query = `
            INSERT INTO login_users (full_name, email, login_prefix, password_hash, password_salt)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, full_name, email, login_prefix, is_active, created_at
        `;
        const result = await pool.query(query, [full_name || null, email, login_prefix, password_hash, password_salt]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const query = `
            SELECT id, full_name, email, login_prefix, password_hash, password_salt, is_active
            FROM login_users
            WHERE email = $1
        `;
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    static async updateLoginPrefix(id, login_prefix) {
        const query = `
            UPDATE login_users
            SET login_prefix = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING login_prefix
        `;
        const result = await pool.query(query, [login_prefix, id]);
        return result.rows[0];
    }
}

module.exports = AuthModel;
