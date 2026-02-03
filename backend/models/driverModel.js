const pool = require('../config/database');

class DriverModel {
    static async generateDriverId() {
        // Generate a random 6-digit number and check if it exists
        let isUnique = false;
        let driverId;
        while (!isUnique) {
            driverId = Math.floor(100000 + Math.random() * 900000).toString();
            const check = await pool.query('SELECT id FROM drivers WHERE driver_id = $1', [driverId]);
            if (check.rows.length === 0) isUnique = true;
        }
        return driverId;
    }

    static async create(driverData) {
        const {
            driver_name, primary_contact_no, secondary_contact_no, blood_group,
            address, license_no, license_exp_date, aadhar_no, bank_name,
            branch, account_number, ifsc_code, driver_status
        } = driverData;

        const driver_id = await this.generateDriverId();

        const query = `
            INSERT INTO drivers (
                driver_id, driver_name, primary_contact_no, secondary_contact_no, 
                blood_group, address, license_no, license_exp_date, aadhar_no, 
                bank_name, branch, account_number, ifsc_code, driver_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            driver_id, driver_name, primary_contact_no, secondary_contact_no || null,
            blood_group, address, license_no, license_exp_date, aadhar_no,
            bank_name, branch, account_number, ifsc_code, driver_status ?? true
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findAll() {
        const query = 'SELECT * FROM drivers ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM drivers WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, driverData) {
        const {
            primary_contact_no, secondary_contact_no, address,
            license_no, license_exp_date, aadhar_no, bank_name,
            branch, account_number, ifsc_code, driver_status
        } = driverData;

        // Note: driver_id, driver_name and blood_group are NOT editable as per requirements (mostly)
        // Image rules: "Driver Name - Mandatory - [x] Editable" - Wait, let me check the image.
        // Image for Driver Master: 
        // Driver ID: Auto - Editable [ ]
        // Driver Name: Text - Editable [ ]
        // Blood Group: Dropdown - Editable [ ]
        // The rest are Editable [x]

        const query = `
            UPDATE drivers 
            SET 
                primary_contact_no = $1, secondary_contact_no = $2, address = $3,
                license_no = $4, license_exp_date = $5, aadhar_no = $6, bank_name = $7,
                branch = $8, account_number = $9, ifsc_code = $10, driver_status = $11
            WHERE id = $12
            RETURNING *
        `;

        const values = [
            primary_contact_no, secondary_contact_no || null, address,
            license_no, license_exp_date, aadhar_no, bank_name,
            branch, account_number, ifsc_code, driver_status, id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM drivers WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Uniqueness checks
    static async existsByContact(contact, excludeId = null) {
        let query = 'SELECT id FROM drivers WHERE primary_contact_no = $1 OR secondary_contact_no = $1';
        const values = [contact];
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }

    static async existsByLicense(license, excludeId = null) {
        let query = 'SELECT id FROM drivers WHERE license_no = $1';
        const values = [license];
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }

    static async existsByAadhar(aadhar, excludeId = null) {
        let query = 'SELECT id FROM drivers WHERE aadhar_no = $1';
        const values = [aadhar];
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }
}

module.exports = DriverModel;
