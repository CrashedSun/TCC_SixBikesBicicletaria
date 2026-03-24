const db = require('../config/database');

class AuditoriaRepository {
    async ensureTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS auditoria_log (
                id BIGSERIAL PRIMARY KEY,
                criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                request_id VARCHAR(64),
                nivel VARCHAR(20) NOT NULL DEFAULT 'INFO',
                acao VARCHAR(120) NOT NULL,
                recurso VARCHAR(120),
                recurso_id VARCHAR(80),
                metodo VARCHAR(10),
                rota VARCHAR(255),
                status_code INT,
                usuario_id BIGINT,
                usuario_perfil VARCHAR(30),
                usuario_email VARCHAR(150),
                ip VARCHAR(64),
                user_agent TEXT,
                mensagem TEXT,
                detalhes JSONB,
                CONSTRAINT auditoria_log_nivel_chk CHECK (nivel IN ('INFO', 'WARN', 'ERROR')),
                CONSTRAINT auditoria_log_usuario_fk FOREIGN KEY (usuario_id) REFERENCES Usuario(id)
            );

            CREATE INDEX IF NOT EXISTS idx_auditoria_log_criado_em ON auditoria_log (criado_em DESC);
            CREATE INDEX IF NOT EXISTS idx_auditoria_log_usuario_id ON auditoria_log (usuario_id);
            CREATE INDEX IF NOT EXISTS idx_auditoria_log_nivel ON auditoria_log (nivel);
            CREATE INDEX IF NOT EXISTS idx_auditoria_log_status_code ON auditoria_log (status_code);
            CREATE INDEX IF NOT EXISTS idx_auditoria_log_rota ON auditoria_log (rota);
        `;

        await db.query(sql);
    }

    async create(log) {
        const sql = `
            INSERT INTO auditoria_log (
                request_id, nivel, acao, recurso, recurso_id,
                metodo, rota, status_code, usuario_id, usuario_perfil,
                usuario_email, ip, user_agent, mensagem, detalhes
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15
            )
            RETURNING id, criado_em;
        `;

        const params = [
            log.requestId || null,
            log.nivel || 'INFO',
            log.acao || 'REQUEST',
            log.recurso || null,
            log.recursoId || null,
            log.metodo || null,
            log.rota || null,
            Number.isInteger(log.statusCode) ? log.statusCode : null,
            Number.isInteger(log.usuarioId) ? log.usuarioId : null,
            log.usuarioPerfil || null,
            log.usuarioEmail || null,
            log.ip || null,
            log.userAgent || null,
            log.mensagem || null,
            log.detalhes ? JSON.stringify(log.detalhes) : null,
        ];

        const { rows } = await db.query(sql, params);
        return rows[0];
    }

    async list(filters = {}) {
        const values = [];
        const where = ['1=1'];

        const push = (expr, value) => {
            values.push(value);
            where.push(expr.replace('?', `$${values.length}`));
        };

        if (filters.nivel) push('nivel = ?', String(filters.nivel).toUpperCase());
        if (filters.metodo) push('metodo = ?', String(filters.metodo).toUpperCase());
        if (filters.statusCode) push('status_code = ?', Number(filters.statusCode));
        if (filters.usuarioId) push('usuario_id = ?', Number(filters.usuarioId));
        if (filters.acao) push('acao ILIKE ?', `%${String(filters.acao)}%`);
        if (filters.rota) push('rota ILIKE ?', `%${String(filters.rota)}%`);
        if (filters.q) {
            values.push(`%${String(filters.q)}%`);
            where.push(`(mensagem ILIKE $${values.length} OR rota ILIKE $${values.length} OR acao ILIKE $${values.length} OR usuario_email ILIKE $${values.length})`);
        }
        if (filters.de) push('criado_em >= ?', filters.de);
        if (filters.ate) push('criado_em <= ?', filters.ate);

        const limit = Math.max(1, Math.min(Number(filters.limit) || 100, 1000));
        const offset = Math.max(0, Number(filters.offset) || 0);

        values.push(limit);
        const limitParam = `$${values.length}`;
        values.push(offset);
        const offsetParam = `$${values.length}`;

        const sql = `
            SELECT
                id,
                criado_em AS "criadoEm",
                request_id AS "requestId",
                nivel,
                acao,
                recurso,
                recurso_id AS "recursoId",
                metodo,
                rota,
                status_code AS "statusCode",
                usuario_id AS "usuarioId",
                usuario_perfil AS "usuarioPerfil",
                usuario_email AS "usuarioEmail",
                ip,
                user_agent AS "userAgent",
                mensagem,
                detalhes
            FROM auditoria_log
            WHERE ${where.join(' AND ')}
            ORDER BY criado_em DESC
            LIMIT ${limitParam} OFFSET ${offsetParam};
        `;

        const { rows } = await db.query(sql, values);
        return rows;
    }
}

module.exports = new AuditoriaRepository();
