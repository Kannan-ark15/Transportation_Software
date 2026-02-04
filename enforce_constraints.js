require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration to strictly enforce constraints on vehicles table...');

        // Note: This will fail if there are existing NULL values in these columns.
        // You might need to UPDATE vehicles SET field='Default' WHERE field IS NULL; before running this if data exists.
        const queries = [
            'ALTER TABLE vehicles ALTER COLUMN pollution_no SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN pollution_expiry_date SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN permit_no SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN permit_from_date SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN permit_till_date SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN insurance_no SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN insurance_base_value SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN insurance_amount SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN fc_no SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN fc_from_date SET NOT NULL',
            'ALTER TABLE vehicles ALTER COLUMN fc_till_date SET NOT NULL'
        ];

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        console.log('Constraints re-enforced successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        if (err.code === '23502') {
            console.error('Reason: Existing data contains NULL values. Please clean up data before enforcing constraints.');
        }
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
