const pool = require('../config/database');

class CompanyModel {
    // Create a new company
    static async create(companyData) {
        const {
            company_name,
            company_address_1,
            company_address_2,
            place,
            gst_no,
            pin_code,
            contact_no,
            email_id
        } = companyData;

        const query = `
      INSERT INTO companies (
        company_name, company_address_1, company_address_2, 
        place, gst_no, pin_code, contact_no, email_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            company_name,
            company_address_1,
            company_address_2 || null,
            place,
            gst_no,
            pin_code,
            contact_no,
            email_id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Get all companies
    static async findAll() {
        const query = 'SELECT * FROM companies ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }

    // Get company by ID
    static async findById(id) {
        const query = 'SELECT * FROM companies WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Update company
    static async update(id, companyData) {
        const {
            company_name,
            company_address_1,
            company_address_2,
            place,
            gst_no,
            pin_code,
            contact_no,
            email_id
        } = companyData;

        const query = `
      UPDATE companies 
      SET 
        company_name = $1,
        company_address_1 = $2,
        company_address_2 = $3,
        place = $4,
        gst_no = $5,
        pin_code = $6,
        contact_no = $7,
        email_id = $8
      WHERE id = $9
      RETURNING *
    `;

        const values = [
            company_name,
            company_address_1,
            company_address_2 || null,
            place,
            gst_no,
            pin_code,
            contact_no,
            email_id,
            id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Delete company
    static async delete(id) {
        const query = 'DELETE FROM companies WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Check if company name exists (for uniqueness validation)
    static async existsByName(company_name, excludeId = null) {
        let query = 'SELECT id FROM companies WHERE company_name = $1';
        const values = [company_name];

        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }

        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }

    // Check if GST number exists (for uniqueness validation)
    static async existsByGST(gst_no, excludeId = null) {
        let query = 'SELECT id FROM companies WHERE gst_no = $1';
        const values = [gst_no];

        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }

        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }

    // Check if contact number exists (for uniqueness validation)
    static async existsByContact(contact_no, excludeId = null) {
        let query = 'SELECT id FROM companies WHERE contact_no = $1';
        const values = [contact_no];

        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }

        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }
}

module.exports = CompanyModel;
