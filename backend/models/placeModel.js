const pool = require('../config/database');

class PlaceModel {
    static normalizeRateCard(rateCard = {}) {
        const toNumber = (value) => {
            if (value === '' || value === null || value === undefined) return 0;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const hasRcl = rateCard.rcl_freight !== '' && rateCard.rcl_freight !== null && rateCard.rcl_freight !== undefined;
        const rclFreight = hasRcl ? toNumber(rateCard.rcl_freight) : 0;
        const ktFreight = rateCard.kt_freight !== undefined && rateCard.kt_freight !== ''
            ? toNumber(rateCard.kt_freight)
            : (hasRcl && Number.isFinite(rclFreight) ? Math.floor(rclFreight) - 1 : 0);

        return {
            vehicle_type: rateCard.vehicle_type || null,
            vehicle_sub_type: rateCard.vehicle_sub_type || null,
            vehicle_body_type: rateCard.vehicle_body_type || null,
            rcl_freight: rclFreight,
            kt_freight: ktFreight,
            driver_bata: toNumber(rateCard.driver_bata),
            advance: toNumber(rateCard.advance),
            unloading: toNumber(rateCard.unloading),
            tarpaulin: toNumber(rateCard.tarpaulin),
            city_tax: toNumber(rateCard.city_tax),
            maintenance: toNumber(rateCard.maintenance)
        };
    }

    static async create(placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            INSERT INTO places (
                company_id, from_place, to_place, district, distance_km, product_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [company_id, from_place, to_place, district, distance_km, product_id]);
        return result.rows[0];
    }

    static async createWithRateCards(placeData, rateCards = []) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const place = await this.createWithClient(client, placeData);
            const createdRateCards = [];

            for (const rateCard of rateCards) {
                const normalized = this.normalizeRateCard(rateCard);
                const rateCardResult = await client.query(
                    'INSERT INTO rate_cards (vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
                    [
                        normalized.vehicle_type,
                        normalized.vehicle_sub_type,
                        normalized.vehicle_body_type,
                        normalized.rcl_freight,
                        normalized.kt_freight,
                        normalized.driver_bata,
                        normalized.advance,
                        normalized.unloading,
                        normalized.tarpaulin,
                        normalized.city_tax,
                        normalized.maintenance
                    ]
                );
                const created = rateCardResult.rows[0];
                createdRateCards.push(created);

                await client.query(
                    'INSERT INTO place_rate_cards (place_id, rate_card_id) VALUES ($1, $2)',
                    [place.id, created.id]
                );
            }

            await client.query('COMMIT');
            return { ...place, rate_cards: createdRateCards };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findAll() {
        // Joining with companies and products to get names
        const query = `
            SELECT p.*, c.company_name, pr.product_name 
            FROM places p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON p.product_id = pr.id
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT p.*, c.company_name, pr.product_name 
            FROM places p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON p.product_id = pr.id
            WHERE p.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByIdWithRateCards(id) {
        const query = `
            SELECT
                p.*,
                c.company_name,
                pr.product_name,
                COALESCE(
                    json_agg(row_to_json(rc) ORDER BY prc.id) FILTER (WHERE rc.id IS NOT NULL),
                    '[]'::json
                ) AS rate_cards
            FROM places p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON p.product_id = pr.id
            LEFT JOIN place_rate_cards prc ON p.id = prc.place_id
            LEFT JOIN rate_cards rc ON prc.rate_card_id = rc.id
            WHERE p.id = $1
            GROUP BY p.id, c.company_name, pr.product_name
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            UPDATE places 
            SET company_id = $1, from_place = $2, to_place = $3, 
                district = $4, distance_km = $5, product_id = $6
            WHERE id = $7
            RETURNING *
        `;

        const result = await pool.query(query, [company_id, from_place, to_place, district, distance_km, product_id, id]);
        return result.rows[0];
    }

    static async updateWithRateCards(id, placeData, rateCards = []) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updatedPlace = await this.updateWithClient(client, id, placeData);

            const existing = await client.query(
                'SELECT rate_card_id FROM place_rate_cards WHERE place_id = $1',
                [id]
            );
            const existingIds = existing.rows.map(row => row.rate_card_id);

            await client.query('DELETE FROM place_rate_cards WHERE place_id = $1', [id]);

            if (existingIds.length > 0) {
                await client.query(
                    `
                        DELETE FROM rate_cards rc
                        WHERE rc.id = ANY($1)
                        AND NOT EXISTS (
                            SELECT 1 FROM place_rate_cards prc WHERE prc.rate_card_id = rc.id
                        )
                    `,
                    [existingIds]
                );
            }

            const createdRateCards = [];
            for (const rateCard of rateCards) {
                const normalized = this.normalizeRateCard(rateCard);
                const rateCardResult = await client.query(
                    'INSERT INTO rate_cards (vehicle_type, vehicle_sub_type, vehicle_body_type, rcl_freight, kt_freight, driver_bata, advance, unloading, tarpaulin, city_tax, maintenance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
                    [
                        normalized.vehicle_type,
                        normalized.vehicle_sub_type,
                        normalized.vehicle_body_type,
                        normalized.rcl_freight,
                        normalized.kt_freight,
                        normalized.driver_bata,
                        normalized.advance,
                        normalized.unloading,
                        normalized.tarpaulin,
                        normalized.city_tax,
                        normalized.maintenance
                    ]
                );
                const created = rateCardResult.rows[0];
                createdRateCards.push(created);
                await client.query(
                    'INSERT INTO place_rate_cards (place_id, rate_card_id) VALUES ($1, $2)',
                    [updatedPlace.id, created.id]
                );
            }

            await client.query('COMMIT');
            return { ...updatedPlace, rate_cards: createdRateCards };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async delete(id) {
        const query = 'DELETE FROM places WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async existsCombination(to_place, product_id, excludeId = null) {
        let query = 'SELECT id FROM places WHERE to_place = $1 AND product_id = $2';
        const values = [to_place, product_id];
        if (excludeId) {
            query += ' AND id != $3';
            values.push(excludeId);
        }
        const result = await pool.query(query, values);
        return result.rows.length > 0;
    }

    static async createWithClient(client, placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            INSERT INTO places (
                company_id, from_place, to_place, district, distance_km, product_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await client.query(query, [company_id, from_place, to_place, district, distance_km, product_id]);
        return result.rows[0];
    }

    static async updateWithClient(client, id, placeData) {
        const {
            company_id, from_place, to_place, district, distance_km, product_id
        } = placeData;

        const query = `
            UPDATE places 
            SET company_id = $1, from_place = $2, to_place = $3, 
                district = $4, distance_km = $5, product_id = $6
            WHERE id = $7
            RETURNING *
        `;

        const result = await client.query(query, [company_id, from_place, to_place, district, distance_km, product_id, id]);
        return result.rows[0];
    }
}

module.exports = PlaceModel;
