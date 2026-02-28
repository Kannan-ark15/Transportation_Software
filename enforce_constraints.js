require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration to align master optional fields and vehicle financial status...');

        const queries = [
            'ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_gst_no_key',
            'ALTER TABLE IF EXISTS dealers DROP CONSTRAINT IF EXISTS dealers_gst_no_key',
            'ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS vehicle_financial_status VARCHAR(20) DEFAULT \'Free\'',
            'ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)',
            'ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS branch VARCHAR(255)',
            'ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS account_number VARCHAR(30)',
            'ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)',
            'UPDATE vehicles SET vehicle_financial_status = \'Free\' WHERE vehicle_financial_status IS NULL OR TRIM(vehicle_financial_status) = \'\'',
            'ALTER TABLE IF EXISTS vehicles ALTER COLUMN vehicle_financial_status SET DEFAULT \'Free\'',
            'ALTER TABLE IF EXISTS vehicles ALTER COLUMN vehicle_financial_status SET NOT NULL',
            'ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_financial_status_check',
            'ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_financial_status_check CHECK (vehicle_financial_status IN (\'Free\', \'Loan\'))',
            `DO $$
            DECLARE
                optional_col TEXT;
            BEGIN
                FOREACH optional_col IN ARRAY ARRAY[
                    'engine_no',
                    'chasis_no',
                    'pollution_no',
                    'pollution_expiry_date',
                    'permit_no',
                    'permit_from_date',
                    'permit_till_date',
                    'fc_no',
                    'fc_from_date',
                    'fc_till_date',
                    'bank_name',
                    'branch',
                    'account_number',
                    'ifsc_code'
                ]
                LOOP
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                            AND table_name = 'vehicles'
                            AND column_name = optional_col
                    ) THEN
                        EXECUTE format('ALTER TABLE vehicles ALTER COLUMN %I DROP NOT NULL', optional_col);
                    END IF;
                END LOOP;
            END;
            $$;`,
            'ALTER TABLE IF EXISTS pumps ALTER COLUMN gst_no DROP NOT NULL',
            'ALTER TABLE IF EXISTS pumps ALTER COLUMN bank_name DROP NOT NULL',
            'ALTER TABLE IF EXISTS pumps ALTER COLUMN branch DROP NOT NULL',
            'ALTER TABLE IF EXISTS pumps ALTER COLUMN account_number DROP NOT NULL',
            'ALTER TABLE IF EXISTS pumps ALTER COLUMN ifsc_code DROP NOT NULL',
            'ALTER TABLE IF EXISTS dealers ALTER COLUMN gst_no DROP NOT NULL',
            'ALTER TABLE IF EXISTS dealers ALTER COLUMN contact_no_1 DROP NOT NULL',
            'ALTER TABLE IF EXISTS dealers ALTER COLUMN sales_officer_no DROP NOT NULL',
            'UPDATE rate_cards SET tarpaulin = NULL WHERE LOWER(COALESCE(vehicle_body_type, \'\')) <> \'open container\'',
            'ALTER TABLE IF EXISTS rate_cards DROP CONSTRAINT IF EXISTS rate_cards_tarpaulin_open_container_check',
            'ALTER TABLE IF EXISTS rate_cards ADD CONSTRAINT rate_cards_tarpaulin_open_container_check CHECK (LOWER(COALESCE(vehicle_body_type, \'\')) = \'open container\' OR tarpaulin IS NULL)'
        ];

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        console.log('Master constraints aligned successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
