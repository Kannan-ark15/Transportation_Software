const pool = require('../config/database');

// Keep these keys aligned with frontend route segments.
// We intentionally only expose columns for a fixed allowlist of tables.
const MASTER_TABLES = {
    company: { label: 'Company Master', table: 'companies' },
    products: { label: 'Product Master', table: 'products' },
    drivers: { label: 'Driver Master', table: 'drivers' },
    pumps: { label: 'Pump Master', table: 'pumps' },
    places: { label: 'Place Master', table: 'places' },
    dealers: { label: 'Dealer Master', table: 'dealers' },
    vehicles: { label: 'Vehicle Master', table: 'vehicles' },
    owners: { label: 'Owner Master', table: 'owners' },
    banks: { label: 'Bank Master', table: 'banks' },
    'rate-cards': { label: 'Rate Card Master', table: 'rate_cards' },
};

const listTemplates = (req, res) => {
    const data = Object.entries(MASTER_TABLES).map(([master, cfg]) => ({
        master,
        label: cfg.label,
        table: cfg.table,
    }));

    return res.status(200).json({ success: true, data });
};

const getTemplateColumns = async (req, res, next) => {
    try {
        const { master } = req.params;
        const cfg = MASTER_TABLES[master];

        if (!cfg) {
            return res.status(400).json({
                success: false,
                message: `Unknown master "${master}"`,
            });
        }

        const result = await pool.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
            ORDER BY ordinal_position ASC
            `,
            [cfg.table]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No columns found for table "${cfg.table}". Is the table created in the database?`,
            });
        }

        const columns = result.rows.map(r => r.column_name);

        return res.status(200).json({
            success: true,
            data: {
                master,
                label: cfg.label,
                table: cfg.table,
                columns,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { listTemplates, getTemplateColumns };

