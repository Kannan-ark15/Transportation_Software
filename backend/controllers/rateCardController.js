const pool = require('../config/database');

const MASTER_FILTER = `
    NOT EXISTS (
        SELECT 1
        FROM place_rate_cards prc
        WHERE prc.rate_card_id = rc.id
    )
`;

const findDuplicateMasterRateCard = async (vehicle_type, vehicle_sub_type, vehicle_body_type, excludeId = null) => {
    const values = [vehicle_type, vehicle_sub_type, vehicle_body_type];
    let query = `
        SELECT rc.id
        FROM rate_cards rc
        WHERE ${MASTER_FILTER}
          AND rc.vehicle_type IS NOT DISTINCT FROM $1
          AND rc.vehicle_sub_type IS NOT DISTINCT FROM $2
          AND rc.vehicle_body_type IS NOT DISTINCT FROM $3
    `;

    if (excludeId) {
        values.push(excludeId);
        query += ' AND rc.id <> $4';
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, values);
    return result.rows.length > 0;
};

const getAllRateCards = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT rc.*
            FROM rate_cards rc
            WHERE ${MASTER_FILTER}
            ORDER BY rc.id DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const getRateCardById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
                SELECT rc.*
                FROM rate_cards rc
                WHERE rc.id = $1
                  AND ${MASTER_FILTER}
            `,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Rate Card not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const createRateCard = async (req, res, next) => {
    try {
        const { vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance } = req.body;

        const duplicateExists = await findDuplicateMasterRateCard(vehicle_type, vehicle_sub_type, vehicle_body_type);
        if (duplicateExists) {
            return res.status(400).json({
                success: false,
                message: 'Rate Card already exists for this vehicle configuration'
            });
        }

        const result = await pool.query(
            'INSERT INTO rate_cards (vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateRateCard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance } = req.body;

        const duplicateExists = await findDuplicateMasterRateCard(vehicle_type, vehicle_sub_type, vehicle_body_type, id);
        if (duplicateExists) {
            return res.status(400).json({
                success: false,
                message: 'Rate Card already exists for this vehicle configuration'
            });
        }

        const result = await pool.query(
            `
                UPDATE rate_cards rc
                SET vehicle_type=$2, vehicle_sub_type=$3, vehicle_body_type=$4, rcl_freight=$5, kt_freight=$6, driver_bata=$7, advance=$8, unloading=$9, tarpaulin=$10, city_tax=$11, maintenance=$12, updated_at=CURRENT_TIMESTAMP
                WHERE rc.id=$1
                  AND ${MASTER_FILTER}
                RETURNING *
            `,
            [id, vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Rate Card not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteRateCard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
                DELETE FROM rate_cards rc
                WHERE rc.id = $1
                  AND ${MASTER_FILTER}
                RETURNING *
            `,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Rate Card not found' });
        res.status(200).json({ success: true, message: 'Rate Card deleted successfully' });
    } catch (error) { next(error); }
};

module.exports = { getAllRateCards, getRateCardById, createRateCard, updateRateCard, deleteRateCard };
