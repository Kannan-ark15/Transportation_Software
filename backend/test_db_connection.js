const pool = require('./config/database');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ Connection successful:', res.rows[0]);
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
