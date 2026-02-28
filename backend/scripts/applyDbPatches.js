const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const buildPoolConfig = () => {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'transport_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 10
    };
};

const ensurePatchTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_patches (
            id SERIAL PRIMARY KEY,
            patch_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const getPatchFiles = async (dirPath) => {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && /^patch_.*\.sql$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
};

const applyPatches = async () => {
    const pool = new Pool(buildPoolConfig());
    const client = await pool.connect();
    const configDir = path.join(__dirname, '..', 'config');

    try {
        await ensurePatchTable(client);

        const files = await getPatchFiles(configDir);
        if (files.length === 0) {
            console.log('No patch files found.');
            return;
        }

        const appliedResult = await client.query('SELECT patch_name FROM schema_patches');
        const appliedSet = new Set(appliedResult.rows.map((row) => row.patch_name));

        for (const fileName of files) {
            if (appliedSet.has(fileName)) {
                console.log(`Skipping ${fileName} (already applied)`);
                continue;
            }

            const filePath = path.join(configDir, fileName);
            const sql = await fs.promises.readFile(filePath, 'utf8');

            console.log(`Applying ${fileName}...`);
            await client.query(sql);
            await client.query('INSERT INTO schema_patches (patch_name) VALUES ($1)', [fileName]);
            console.log(`Applied ${fileName}`);
        }

        console.log('DB patch sync completed.');
    } finally {
        client.release();
        await pool.end();
    }
};

applyPatches().catch((error) => {
    console.error('Failed to apply DB patches:', error.message);
    process.exit(1);
});
