const { Pool } = require('pg');
require('dotenv').config();
const { buildPoolConfig } = require('./poolConfig');

const pool = new Pool(buildPoolConfig({
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}));

// Test database connection
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

module.exports = pool;
