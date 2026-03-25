const db = require('../config/database');

class PasswordResetRepository {
    async ensureTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS password_reset_token (
                id BIGSERIAL PRIMARY KEY,
                usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
                token_hash VARCHAR(128) NOT NULL UNIQUE,
                expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                used_at TIMESTAMP WITHOUT TIME ZONE,
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                request_ip VARCHAR(64),
                user_agent TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_password_reset_usuario_id ON password_reset_token(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_token(expires_at);
            CREATE INDEX IF NOT EXISTS idx_password_reset_open_tokens ON password_reset_token(usuario_id, used_at, expires_at);
        `;

        await db.query(sql);
    }

    async createToken({ usuarioId, tokenHash, expiresAt, requestIp, userAgent }) {
        const sql = `
            INSERT INTO password_reset_token (usuario_id, token_hash, expires_at, request_ip, user_agent)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at;
        `;
        const { rows } = await db.query(sql, [usuarioId, tokenHash, expiresAt, requestIp || null, userAgent || null]);
        return rows[0];
    }

    async hasRecentOpenRequest(usuarioId, cooldownMinutes = 2) {
        const sql = `
            SELECT 1
            FROM password_reset_token
            WHERE usuario_id = $1
              AND used_at IS NULL
              AND expires_at >= CURRENT_TIMESTAMP
              AND created_at >= (CURRENT_TIMESTAMP - ($2::text || ' minutes')::interval)
            LIMIT 1;
        `;
        const { rows } = await db.query(sql, [usuarioId, cooldownMinutes]);
        return rows.length > 0;
    }

    async findValidByTokenHash(tokenHash) {
        const sql = `
            SELECT id, usuario_id AS "usuarioId", expires_at AS "expiresAt", used_at AS "usedAt"
            FROM password_reset_token
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at >= CURRENT_TIMESTAMP
            LIMIT 1;
        `;
        const { rows } = await db.query(sql, [tokenHash]);
        return rows[0] || null;
    }

    async markUsed(id) {
        const sql = `
            UPDATE password_reset_token
            SET used_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND used_at IS NULL;
        `;
        const result = await db.query(sql, [id]);
        return result.rowCount > 0;
    }

    async invalidateOpenTokensByUser(usuarioId) {
        const sql = `
            UPDATE password_reset_token
            SET used_at = CURRENT_TIMESTAMP
            WHERE usuario_id = $1
              AND used_at IS NULL
              AND expires_at >= CURRENT_TIMESTAMP;
        `;
        await db.query(sql, [usuarioId]);
    }

    async cleanupExpired(days = 7) {
        const sql = `
            DELETE FROM password_reset_token
            WHERE (expires_at < CURRENT_TIMESTAMP - ($1::text || ' days')::interval)
               OR (used_at IS NOT NULL AND used_at < CURRENT_TIMESTAMP - ($1::text || ' days')::interval);
        `;
        await db.query(sql, [days]);
    }
}

module.exports = new PasswordResetRepository();
