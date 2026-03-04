// server/repositories/TicketRepository.js
const db = require('../config/database');

class TicketRepository {
    /**
     * Cria um novo ticket de suporte.
     * Campos: nome, email, titulo, mensagem, status='ABERTO', idFuncionarioResposta null, dataAbertura=NOW()
     */
    async create({ idCliente, nome, email, titulo, mensagem }) {
        const sql = `INSERT INTO ticket (idcliente, nome, email, titulo, mensagem, status, idfuncionarioresposta, dataabertura)
                     VALUES ($1, $2, $3, $4, $5, 'ABERTO', NULL, NOW()) RETURNING idticket`;
        const params = [idCliente || null, nome || null, email || null, titulo || null, mensagem || null];
        const result = await db.query(sql, params);
        return result.rows[0].idticket;
    }

    async listByStatus(status) {
        const sql = `SELECT idticket AS id, nome, email, titulo, mensagem, status, idfuncionarioresposta, dataabertura
                     FROM ticket WHERE status = $1 ORDER BY dataabertura ASC`;
        const result = await db.query(sql, [status]);
        return result.rows;
    }

    async listAssignedTo(funcionarioId) {
        const sql = `SELECT idticket AS id, nome, email, titulo, mensagem, status, idfuncionarioresposta, dataabertura
                     FROM ticket WHERE status = 'EM ATENDIMENTO' AND idfuncionarioresposta = $1 ORDER BY dataabertura ASC`;
        const result = await db.query(sql, [funcionarioId]);
        return result.rows;
    }

    async assignTo(idTicket, funcionarioId) {
        const sql = `UPDATE ticket SET status = 'EM ATENDIMENTO', idfuncionarioresposta = $2 WHERE idticket = $1 AND status = 'ABERTO'`;
        const result = await db.query(sql, [idTicket, funcionarioId]);
        return result.rowCount > 0;
    }

    async close(idTicket) {
        const sql = `UPDATE ticket SET status = 'FECHADO' WHERE idticket = $1 AND status <> 'FECHADO'`;
        const result = await db.query(sql, [idTicket]);
        return result.rowCount > 0;
    }

    async getById(idTicket) {
        const sql = `SELECT idticket AS id, idcliente, nome, email, titulo, mensagem, status, idfuncionarioresposta, dataabertura
                     FROM ticket WHERE idticket = $1`;
        const result = await db.query(sql, [idTicket]);
        return result.rows[0] || null;
    }
}
module.exports = new TicketRepository();