const db = require('../config/database');

class ConhecimentoTicketRepository {
    async list() {
        const sql = `
            SELECT
                idconhecimento AS id,
                titulo,
                descricao,
                tags,
                ativo,
                criado_em,
                atualizado_em
            FROM conhecimento_ticket
            ORDER BY atualizado_em DESC, idconhecimento DESC
        `;
        const { rows } = await db.query(sql);
        return rows;
    }

    async getById(id) {
        const sql = `
            SELECT
                idconhecimento AS id,
                titulo,
                descricao,
                tags,
                ativo,
                criado_em,
                atualizado_em
            FROM conhecimento_ticket
            WHERE idconhecimento = $1
        `;
        const { rows } = await db.query(sql, [id]);
        return rows[0] || null;
    }

    async create({ titulo, descricao, tags, ativo = true }) {
        const sql = `
            INSERT INTO conhecimento_ticket (titulo, descricao, tags, ativo, criado_em, atualizado_em)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING idconhecimento AS id
        `;
        const { rows } = await db.query(sql, [titulo, descricao, tags || null, Boolean(ativo)]);
        return rows[0].id;
    }

    async update(id, { titulo, descricao, tags, ativo }) {
        const sql = `
            UPDATE conhecimento_ticket
               SET titulo = $2,
                   descricao = $3,
                   tags = $4,
                   ativo = $5,
                   atualizado_em = NOW()
             WHERE idconhecimento = $1
        `;
        const result = await db.query(sql, [id, titulo, descricao, tags || null, Boolean(ativo)]);
        return result.rowCount > 0;
    }

    async remove(id) {
        const result = await db.query('DELETE FROM conhecimento_ticket WHERE idconhecimento = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = new ConhecimentoTicketRepository();
