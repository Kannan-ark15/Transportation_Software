require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration to align GST and Vehicle Master constraints...');

        const queries = [
            'ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_gst_no_key',
            'ALTER TABLE IF EXISTS dealers DROP CONSTRAINT IF EXISTS dealers_gst_no_key',
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
                    'fc_till_date'
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
            $$;`
        ];

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        console.log('Constraints aligned successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
