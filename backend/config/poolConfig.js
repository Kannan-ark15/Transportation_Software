const buildDatabaseUrlConfig = (connectionString) => {
    try {
        const url = new URL(connectionString);
        const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase();

        // pg warns on sslmode=require/prefer/verify-ca; pass the TLS intent explicitly instead.
        url.searchParams.delete('sslmode');

        if (sslmode === 'disable') {
            return { connectionString: url.toString(), ssl: false };
        }

        if (sslmode === 'verify-full') {
            return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
        }

        return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
    } catch (error) {
        return { connectionString, ssl: { rejectUnauthorized: false } };
    }
};

const buildPoolConfig = (options = {}) => {
    if (process.env.DATABASE_URL) {
        return {
            ...buildDatabaseUrlConfig(process.env.DATABASE_URL),
            ...options,
        };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'transport_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ...options,
    };
};

module.exports = { buildPoolConfig };
