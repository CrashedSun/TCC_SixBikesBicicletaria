const db = require('../config/database');

class SiteConfigRepository {
    async ensureTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS site_config (
                id SMALLINT PRIMARY KEY DEFAULT 1,
                dados JSONB NOT NULL DEFAULT '{}'::jsonb,
                atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT site_config_single_row CHECK (id = 1)
            );
        `;
        await db.query(sql);
        await db.query(
            `INSERT INTO site_config (id, dados)
             VALUES (1, '{}'::jsonb)
             ON CONFLICT (id) DO NOTHING;`
        );
    }

    async getRawConfig() {
        const { rows } = await db.query('SELECT dados FROM site_config WHERE id = 1 LIMIT 1;');
        return rows[0]?.dados || {};
    }

    async updateRawConfig(nextConfig) {
        const { rows } = await db.query(
            `UPDATE site_config
             SET dados = $1::jsonb,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = 1
             RETURNING dados, atualizado_em;`,
            [JSON.stringify(nextConfig || {})]
        );
        return rows[0] || null;
    }
}

module.exports = new SiteConfigRepository();
