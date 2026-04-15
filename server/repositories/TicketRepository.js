// server/repositories/TicketRepository.js
const db = require('../config/database');

class TicketRepository {
    async ensureSchema() {
        await db.query(`
            ALTER TABLE ticket
                ADD COLUMN IF NOT EXISTS assunto_resumido VARCHAR(255),
                ADD COLUMN IF NOT EXISTS id_atendente BIGINT REFERENCES usuario(id),
                ADD COLUMN IF NOT EXISTS data_assumido TIMESTAMP,
                ADD COLUMN IF NOT EXISTS data_fechado TIMESTAMP,
                ADD COLUMN IF NOT EXISTS nivel_prioridade VARCHAR(20),
                ADD COLUMN IF NOT EXISTS tipo_ticket VARCHAR(50),
                ADD COLUMN IF NOT EXISTS tempo_resposta_min INT;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS mensagem_ticket (
                idmensagem BIGSERIAL PRIMARY KEY,
                idticket BIGINT NOT NULL REFERENCES ticket(idticket) ON DELETE CASCADE,
                idusuario BIGINT REFERENCES usuario(id),
                nome_remetente VARCHAR(120) NOT NULL,
                tipo_usuario VARCHAR(30) NOT NULL,
                conteudo TEXT NOT NULL,
                criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS conhecimento_ticket (
                idconhecimento BIGSERIAL PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT NOT NULL,
                tags VARCHAR(500),
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ticket_atendente ON ticket(id_atendente);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_mensagem_ticket_id ON mensagem_ticket(idticket, criado_em);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_conhecimento_ticket_ativo ON conhecimento_ticket(ativo);`);
    }

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

    async createChatTicket({ idCliente, nome, email, assuntoResumido, mensagemInicial }) {
        const sql = `
            INSERT INTO ticket (
                idcliente, nome, email, titulo, mensagem, assunto_resumido,
                status, idfuncionarioresposta, id_atendente, dataabertura, tipo_ticket
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'ABERTO', NULL, NULL, NOW(), 'CHAT')
            RETURNING idticket
        `;
        const titulo = (assuntoResumido || 'Atendimento via chat').slice(0, 150);
        const resumo = (assuntoResumido || '').slice(0, 255);
        const corpo = (mensagemInicial || assuntoResumido || '').trim();
        const params = [idCliente || null, nome || null, email || null, titulo, corpo, resumo];
        const result = await db.query(sql, params);
        return result.rows[0].idticket;
    }

    async listByStatus(status) {
        const sql = `
            SELECT
                t.idticket AS id,
                t.idcliente,
                t.nome,
                t.email,
                t.titulo,
                t.assunto_resumido,
                COALESCE(t.assunto_resumido, t.titulo, 'Sem assunto') AS assunto,
                t.mensagem,
                t.status,
                t.idfuncionarioresposta,
                t.id_atendente,
                t.dataabertura,
                t.data_assumido,
                t.data_fechado,
                t.tipo_ticket,
                u.nome AS atendente_nome
            FROM ticket t
            LEFT JOIN usuario u ON u.id = COALESCE(t.id_atendente, t.idfuncionarioresposta)
            WHERE t.status = $1
            ORDER BY t.dataabertura ASC
        `;
        const result = await db.query(sql, [status]);
        return result.rows;
    }

    async listAssignedTo(funcionarioId) {
        const sql = `
            SELECT
                idticket AS id,
                idcliente,
                nome,
                email,
                titulo,
                assunto_resumido,
                COALESCE(assunto_resumido, titulo, 'Sem assunto') AS assunto,
                mensagem,
                status,
                idfuncionarioresposta,
                id_atendente,
                dataabertura,
                data_assumido,
                data_fechado,
                tipo_ticket
            FROM ticket
            WHERE status = 'EM ATENDIMENTO' AND COALESCE(id_atendente, idfuncionarioresposta) = $1
            ORDER BY dataabertura ASC
        `;
        const result = await db.query(sql, [funcionarioId]);
        return result.rows;
    }

    async listByClient(idCliente) {
        const sql = `
            SELECT
                idticket AS id,
                idcliente,
                nome,
                email,
                titulo,
                assunto_resumido,
                COALESCE(assunto_resumido, titulo, 'Sem assunto') AS assunto,
                status,
                dataabertura,
                data_assumido,
                data_fechado,
                tipo_ticket
            FROM ticket
            WHERE idcliente = $1
            ORDER BY dataabertura DESC
        `;
        const result = await db.query(sql, [idCliente]);
        return result.rows;
    }

    async assignTo(idTicket, funcionarioId) {
        const sql = `
            UPDATE ticket
               SET status = 'EM ATENDIMENTO',
                   idfuncionarioresposta = $2::integer,
                   id_atendente = $3::bigint,
                   data_assumido = NOW()
             WHERE idticket = $1
               AND status = 'ABERTO'
        `;
        const result = await db.query(sql, [idTicket, funcionarioId, funcionarioId]);
        return result.rowCount > 0;
    }

    async assignWithSystemMessage(idTicket, funcionarioId, conteudo) {
        await db.query('BEGIN');
        try {
            const assignSql = `
                UPDATE ticket
                   SET status = 'EM ATENDIMENTO',
                       idfuncionarioresposta = $2::integer,
                       id_atendente = $3::bigint,
                       data_assumido = NOW()
                 WHERE idticket = $1
                   AND status = 'ABERTO'
                RETURNING idticket
            `;
            const assignResult = await db.query(assignSql, [idTicket, funcionarioId, funcionarioId]);
            if (assignResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            const messageSql = `
                INSERT INTO mensagem_ticket (idticket, idusuario, nome_remetente, tipo_usuario, conteudo, criado_em)
                VALUES ($1, NULL, $2, $3, $4, NOW())
            `;
            await db.query(messageSql, [idTicket, 'Sistema', 'SISTEMA', String(conteudo || 'Ticket assumido.')]);

            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    async close(idTicket) {
        const sql = `
            UPDATE ticket
               SET status = 'FECHADO',
                   data_fechado = NOW(),
                   tempo_resposta_min = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - dataabertura))::INT / 60)
             WHERE idticket = $1
               AND status <> 'FECHADO'
        `;
        const result = await db.query(sql, [idTicket]);
        return result.rowCount > 0;
    }

    async closeWithSystemMessage(idTicket, conteudo) {
        await db.query('BEGIN');
        try {
            const closeSql = `
                UPDATE ticket
                   SET status = 'FECHADO',
                       data_fechado = NOW(),
                       tempo_resposta_min = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - dataabertura))::INT / 60)
                 WHERE idticket = $1
                   AND status <> 'FECHADO'
                RETURNING idticket
            `;
            const closeResult = await db.query(closeSql, [idTicket]);
            if (closeResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            const messageSql = `
                INSERT INTO mensagem_ticket (idticket, idusuario, nome_remetente, tipo_usuario, conteudo, criado_em)
                VALUES ($1, NULL, $2, $3, $4, NOW())
            `;
            await db.query(messageSql, [idTicket, 'Sistema', 'SISTEMA', String(conteudo || 'Ticket encerrado.')]);

            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    async reopen(idTicket) {
        const sql = `
            UPDATE ticket
               SET status = 'ABERTO',
                   idfuncionarioresposta = NULL,
                   id_atendente = NULL,
                   data_assumido = NULL,
                   data_fechado = NULL
             WHERE idticket = $1
               AND status = 'FECHADO'
        `;
        const result = await db.query(sql, [idTicket]);
        return result.rowCount > 0;
    }

    async reopenWithSystemMessage(idTicket, conteudo) {
        await db.query('BEGIN');
        try {
            const reopenSql = `
                UPDATE ticket
                   SET status = 'ABERTO',
                       idfuncionarioresposta = NULL,
                       id_atendente = NULL,
                       data_assumido = NULL,
                       data_fechado = NULL
                 WHERE idticket = $1
                   AND status = 'FECHADO'
                RETURNING idticket
            `;
            const reopenResult = await db.query(reopenSql, [idTicket]);
            if (reopenResult.rowCount === 0) {
                await db.query('ROLLBACK');
                return false;
            }

            const messageSql = `
                INSERT INTO mensagem_ticket (idticket, idusuario, nome_remetente, tipo_usuario, conteudo, criado_em)
                VALUES ($1, NULL, $2, $3, $4, NOW())
            `;
            await db.query(messageSql, [idTicket, 'Sistema', 'SISTEMA', String(conteudo || 'Ticket reaberto.')]);

            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    async getById(idTicket) {
        const sql = `
            SELECT
                t.idticket AS id,
                t.idcliente,
                t.nome,
                t.email,
                t.titulo,
                t.assunto_resumido,
                COALESCE(t.assunto_resumido, t.titulo, 'Sem assunto') AS assunto,
                t.mensagem,
                t.status,
                t.idfuncionarioresposta,
                t.id_atendente,
                t.dataabertura,
                t.data_assumido,
                t.data_fechado,
                t.tipo_ticket,
                u.nome AS atendente_nome
            FROM ticket t
            LEFT JOIN usuario u ON u.id = COALESCE(t.id_atendente, t.idfuncionarioresposta)
            WHERE t.idticket = $1
        `;
        const result = await db.query(sql, [idTicket]);
        return result.rows[0] || null;
    }

    async getDashboard() {
        const [abertos, emAtendimento, fechados] = await Promise.all([
            this.listByStatus('ABERTO'),
            this.listByStatus('EM ATENDIMENTO'),
            this.listByStatus('FECHADO')
        ]);
        return { abertos, emAtendimento, fechados };
    }

    async addMessage(idTicket, { idUsuario, nomeRemetente, tipoUsuario, conteudo }) {
        const sql = `
            INSERT INTO mensagem_ticket (idticket, idusuario, nome_remetente, tipo_usuario, conteudo, criado_em)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING idmensagem AS id, idticket, idusuario, nome_remetente, tipo_usuario, conteudo, criado_em
        `;
        const result = await db.query(sql, [idTicket, idUsuario || null, nomeRemetente, tipoUsuario, conteudo]);
        return result.rows[0];
    }

    async listMessages(idTicket) {
        const sql = `
            SELECT
                idmensagem AS id,
                idticket,
                idusuario,
                nome_remetente,
                tipo_usuario,
                conteudo,
                criado_em
            FROM mensagem_ticket
            WHERE idticket = $1
            ORDER BY criado_em ASC, idmensagem ASC
        `;
        const result = await db.query(sql, [idTicket]);
        return result.rows;
    }
}
module.exports = new TicketRepository();