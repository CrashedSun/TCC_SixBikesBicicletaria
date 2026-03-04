// server/repositories/AgendamentoRepository.js
const db = require('../config/database');

class AgendamentoRepository {
    
    // Gravação real de um novo agendamento (UC006)
    async create(agendamentoData) {
        const { clienteId, idservico, dataAgendada, observacoes, status } = agendamentoData;
        const sql = `
            INSERT INTO agendamento (idservico, idcliente, status, dataAgendada, observacoes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const params = [Number(idservico), Number(clienteId), status || 'ABERTO', dataAgendada ? new Date(dataAgendada) : null, observacoes || null];
        const res = await db.query(sql, params);
        const newId = res.rows[0].id;
        return newId;
    }

    // Simula a busca de agendamentos por critérios (perfil, data)
    async findByCriteria(criteria) {
        // SQL Real: SELECT * FROM Agendamento WHERE idMecanico = $1 AND status != 'CONCLUIDO'
        console.log(`[DB] Consultando agendamentos por perfil: ${criteria.perfil}`);
        return [
            { id: 1, cliente: "Júlia", servico: "Revisão", status: "PENDENTE" },
            { id: 2, cliente: "Lucas", servico: "Troca Pneu", status: "EM ANDAMENTO" }
        ];
    }
    
    // Lista agendamentos de um cliente específico
    async findByCliente(clienteId) {
        const sql = `
            SELECT a.id, a.idservico, s.nome AS servico_nome, s.duracaoestimada, s.valor,
                   a.status, a.datacriacao, a.dataAgendada, a.observacoes
            FROM agendamento a
            JOIN servicos s ON s.idservico = a.idservico
            WHERE a.idcliente = $1
            ORDER BY a.datacriacao DESC;
        `;
        const res = await db.query(sql, [Number(clienteId)]);
        return res.rows;
    }

    // Lista agendamentos abertos (sem mecânico e status ABERTO)
    async findAbertos() {
        const sql = `
            SELECT a.id, a.idservico, s.nome AS servico_nome, s.duracaoestimada, s.valor,
                   a.status, a.datacriacao, a.dataAgendada, a.observacoes,
                   u.nome AS cliente_nome
            FROM agendamento a
            JOIN servicos s ON s.idservico = a.idservico
            JOIN usuario u ON u.id = a.idcliente
            WHERE a.status = 'ABERTO'
            ORDER BY a.datacriacao ASC;
        `;
        const res = await db.query(sql);
        return res.rows;
    }

    // Lista agendamentos assumidos por um mecânico, ainda não concluídos
    async findAtivosDoMecanico(mecanicoId) {
        const sql = `
            SELECT a.id, a.idservico, s.nome AS servico_nome, s.duracaoestimada, s.valor,
                   a.status, a.datacriacao, a.dataAgendada, a.observacoes,
                   u.nome AS cliente_nome
            FROM agendamento a
            JOIN servicos s ON s.idservico = a.idservico
            JOIN usuario u ON u.id = a.idcliente
            WHERE a.idmecanico = $1 AND a.status = 'EM ANDAMENTO'
            ORDER BY a.dataAgendada NULLS LAST, a.datacriacao DESC;
        `;
        const res = await db.query(sql, [Number(mecanicoId)]);
        return res.rows;
    }

    // Mecânico assume um agendamento: define idmecanico e muda para EM ANDAMENTO, somente se ABERTO
    async assumir(agendamentoId, mecanicoId) {
        const sql = `
            UPDATE agendamento
               SET idmecanico = $2,
                   status = 'EM ANDAMENTO'
             WHERE id = $1
               AND status = 'ABERTO'
            RETURNING id, status, idmecanico;
        `;
        const res = await db.query(sql, [Number(agendamentoId), Number(mecanicoId)]);
        if (res.rows.length === 0) {
            throw new Error('Agendamento não está disponível para assumir.');
        }
        return res.rows[0];
    }

    async findById(id) {
        const sql = `
            SELECT id, idservico, idcliente, idmecanico, status, datacriacao, dataAgendada, observacoes
            FROM agendamento
            WHERE id = $1;
        `;
        const res = await db.query(sql, [Number(id)]);
        return res.rows[0] || null;
    }

    async addItemUsado(agendamentoId, idservico, idproduto, quantidade) {
        const sql = `
            INSERT INTO itemagendamento (idagendamento, idservico, idproduto, quantidade)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const res = await db.query(sql, [Number(agendamentoId), Number(idservico), Number(idproduto), Number(quantidade)]);
        return res.rows[0].id;
    }

    async listarItens(agendamentoId) {
        const sql = `
            SELECT ia.id, ia.idproduto, ia.quantidade, p.nome
            FROM itemagendamento ia
            JOIN produto p ON p.idproduto = ia.idproduto
            WHERE ia.idagendamento = $1
            ORDER BY ia.id;
        `;
        const res = await db.query(sql, [Number(agendamentoId)]);
        return res.rows;
    }

    async getItem(itemId) {
        const sql = `
            SELECT id, idagendamento, idproduto, quantidade
            FROM itemagendamento
            WHERE id = $1;
        `;
        const res = await db.query(sql, [Number(itemId)]);
        return res.rows[0] || null;
    }

    async deleteItem(itemId, agendamentoId) {
        const sql = `DELETE FROM itemagendamento WHERE id = $1 AND idagendamento = $2;`;
        const res = await db.query(sql, [Number(itemId), Number(agendamentoId)]);
        return res.rowCount > 0;
    }

    async finalizarServico(agendamentoId, mecanicoId) {
        const sql = `
            UPDATE agendamento
            SET status = 'PARA PAGAMENTO'
            WHERE id = $1 AND idmecanico = $2 AND status = 'EM ANDAMENTO'
            RETURNING id, status;
        `;
        const res = await db.query(sql, [Number(agendamentoId), Number(mecanicoId)]);
        return res.rows[0] || null;
    }

    async findParaPagamento() {
        const sql = `
            SELECT a.id, a.idservico, s.nome AS servico_nome, s.duracaoestimada, s.valor,
                   a.status, a.datacriacao, a.dataAgendada, a.observacoes,
                   u.nome AS cliente_nome, u.cpf AS cliente_cpf
            FROM agendamento a
            JOIN servicos s ON s.idservico = a.idservico
            JOIN usuario u ON u.id = a.idcliente
            WHERE a.status = 'PARA PAGAMENTO'
            ORDER BY a.datacriacao DESC;
        `;
        const res = await db.query(sql);
        return res.rows;
    }

    async marcarPago(agendamentoId, metodoPagamento) {
        const sql = `
            UPDATE agendamento
            SET status = 'PAGO',
                metodopagamento = $2,
                datapagamento = NOW()
            WHERE id = $1 AND status = 'PARA PAGAMENTO'
            RETURNING id, status;
        `;
        const res = await db.query(sql, [Number(agendamentoId), metodoPagamento]);
        return res.rows[0] || null;
    }

    // Lista agendamentos cuja dataAgendada é hoje (visão gerencial)
    async findHoje() {
        const sql = `
            SELECT a.id, a.idservico, s.nome AS servico_nome, s.duracaoestimada, s.valor,
                   a.status, a.datacriacao, a.dataAgendada, a.observacoes,
                   u.nome AS cliente_nome, u.cpf AS cliente_cpf
            FROM agendamento a
            JOIN servicos s ON s.idservico = a.idservico
            JOIN usuario u ON u.id = a.idcliente
            WHERE DATE(a.dataAgendada) = CURRENT_DATE
              AND a.status <> 'CANCELADO'
            ORDER BY a.dataAgendada ASC, a.datacriacao DESC;`;
        const res = await db.query(sql);
        return res.rows;
    }
    
    // Simula a atualização do status e registro de execução (UC010)
    async updateExecutionStatus(agendamentoId, dadosExecucao) {
        // SQL Real: UPDATE Agendamento SET status = 'CONCLUIDO', data_conclusao = NOW(), pecas_usadas = $2 WHERE idAgendamento = $1
        console.log(`[DB] Agendamento ${agendamentoId} marcado como CONCLUÍDO.`);
        return true;
    }
}
module.exports = new AgendamentoRepository();