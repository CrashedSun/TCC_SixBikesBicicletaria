// server/repositories/ReservaRepository.js
const db = require('../config/database');

class ReservaRepository {
    async criarReservaComItens({ clienteId, prazoRetirada, itens }) {
        const client = await db.getClient?.() || db; // compat: pool ou client único
        try {
            if (client.query) await client.query('BEGIN');
            const insertReservaSQL = `
                INSERT INTO reserva (idcliente, datareserva, prazoretirada, status, statuspagamento)
                VALUES ($1, CURRENT_TIMESTAMP, COALESCE($2, CURRENT_TIMESTAMP + INTERVAL '3 days'), 'ATIVA', 'PENDENTE') RETURNING idreserva AS "idReserva"`;  
            const prazoRetiradaValue = prazoRetirada || null;
            const { rows } = await client.query(insertReservaSQL, [clienteId, prazoRetiradaValue]);
            const idReserva = rows[0].idreserva || rows[0].idReserva;
            // PRIMEIRO: Verificar estoque de TODOS os itens antes de inserir qualquer coisa
            for (const it of itens) {
                const qtd = parseInt(it.quantidade, 10) || 1;
                const selEstoqueSQL = 'SELECT quantidadeatual FROM estoque WHERE idproduto = $1 FOR UPDATE';
                const estRes = await client.query(selEstoqueSQL, [it.idProduto]);
                
                if (!estRes.rows || estRes.rows.length === 0) {
                    throw new Error(`Estoque não encontrado para o produto ${it.idProduto}`);
                }
                
                const atual = parseInt(estRes.rows[0].quantidadeatual, 10) || 0;
                if (atual < qtd) {
                    throw new Error(`Estoque insuficiente para o produto ${it.idProduto}. Disponível: ${atual}, solicitado: ${qtd}`);
                }
            }

            // SEGUNDO: Inserir itens e decrementar estoque
            const insertItemSQL = `
                INSERT INTO itemreserva (idreserva, idproduto, quantidade, valorunitario)
                VALUES ($1, $2, $3, $4)`;
            for (const it of itens) {
                const qtd = parseInt(it.quantidade, 10) || 1;
                const val = typeof it.valorUnitario === 'number' ? it.valorUnitario : parseFloat(String(it.valorUnitario||'0').replace(',','.')) || 0;
                
                // Inserir item na reserva
                await client.query(insertItemSQL, [idReserva, it.idProduto, qtd, val]);

                // Decrementar estoque (já validado acima)
                await client.query('UPDATE estoque SET quantidadeatual = quantidadeatual - $2 WHERE idproduto = $1', [it.idProduto, qtd]);
            }
            if (client.query) await client.query('COMMIT');
            return idReserva;
        } catch (e) {
            if (client.query) await client.query('ROLLBACK');
            throw e;
        }
    }

    async listarPorCliente(clienteId) {
        const sql = `
            SELECT r.idreserva, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento,
                   COALESCE(SUM(ir.quantidade * ir.valorunitario), 0) AS totalreserva
              FROM reserva r
         LEFT JOIN itemreserva ir ON ir.idreserva = r.idreserva
             WHERE r.idcliente = $1
          GROUP BY r.idreserva, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento
          ORDER BY r.datareserva DESC`;
        const { rows } = await db.query(sql, [clienteId]);
        return rows;
    }

    async listarPorStatusPagamento(statusPagamento = 'PENDENTE') {
        const sql = `
            SELECT r.idreserva, r.idcliente, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento, r.idatendente,
                   u.nome as nomecliente,
                   COALESCE(SUM(ir.quantidade * ir.valorunitario), 0) AS totalreserva
              FROM reserva r
              JOIN usuario u ON u.id = r.idcliente
         LEFT JOIN itemreserva ir ON ir.idreserva = r.idreserva
               WHERE r.statuspagamento = $1 AND r.status = 'ATIVA'
          GROUP BY r.idreserva, r.idcliente, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento, r.idatendente, u.nome
          ORDER BY r.datareserva DESC`;
        const { rows } = await db.query(sql, [statusPagamento]);
        return rows;
    }

    async obterPorIdComItens(idReserva) {
        const cabecaSQL = `
            SELECT r.idreserva, r.idcliente, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento, r.idatendente,
                   u.nome as nomecliente
              FROM reserva r
              JOIN usuario u ON u.id = r.idcliente
             WHERE r.idreserva = $1`;
           const itensSQL = `
              SELECT ir.idreserva, ir.idproduto, ir.quantidade, ir.valorunitario,
                    p.nome as nomeproduto
                FROM itemreserva ir
                JOIN produto p ON p.idproduto = ir.idproduto
               WHERE ir.idreserva = $1
               ORDER BY ir.idproduto`;
        const cabeca = await db.query(cabecaSQL, [idReserva]);
        if (!cabeca.rows || cabeca.rows.length === 0) return null;
        const itens = await db.query(itensSQL, [idReserva]);
        return { reserva: cabeca.rows[0], itens: itens.rows || [] };
    }

    async substituirItens(idReserva, itens) {
        const client = await db.getClient?.() || db;
        try {
            if (client.query) await client.query('BEGIN');
            await client.query('DELETE FROM itemreserva WHERE idReserva = $1', [idReserva]);
            const insertItemSQL = 'INSERT INTO itemreserva (idReserva, idProduto, quantidade, valorUnitario) VALUES ($1,$2,$3,$4)';
            for (const it of itens) {
                const qtd = parseInt(it.quantidade, 10) || 1;
                const val = typeof it.valorUnitario === 'number' ? it.valorUnitario : parseFloat(String(it.valorUnitario||'0').replace(',','.')) || 0;
                await client.query(insertItemSQL, [idReserva, it.idProduto, qtd, val]);
            }
            if (client.query) await client.query('COMMIT');
            return true;
        } catch (e) {
            if (client.query) await client.query('ROLLBACK');
            throw e;
        }
    }

    async atualizarPagamento(idReserva, statusPagamento, metodoPagamento = null, idAtendente = null, cancelar = false) {
        if (cancelar) {
            // Ao cancelar, retornar itens ao estoque dentro de uma transação
            const client = await db.getClient?.() || db;
            try {
                if (client.query) await client.query('BEGIN');

                // Seleciona itens da reserva e bloqueia estoque das linhas envolvidas
                const itensSQL = 'SELECT idproduto, quantidade FROM itemreserva WHERE idreserva = $1';
                const { rows: itens } = await client.query(itensSQL, [idReserva]);
                for (const it of itens) {
                    // Bloqueia e atualiza estoque somando a quantidade
                    const lockSQL = 'SELECT quantidadeatual FROM estoque WHERE idproduto = $1 FOR UPDATE';
                    const est = await client.query(lockSQL, [it.idproduto]);
                    if (est.rows && est.rows.length > 0) {
                        const atual = parseInt(est.rows[0].quantidadeatual, 10) || 0;
                        const novo = atual + (parseInt(it.quantidade, 10) || 0);
                        await client.query('UPDATE estoque SET quantidadeatual = $2 WHERE idproduto = $1', [it.idproduto, novo]);
                    }
                }

                // Atualiza status da reserva para CANCELADA e statusPagamento conforme parâmetro
                const updSQL = 'UPDATE reserva SET statuspagamento = $2, status = $3 WHERE idreserva = $1';
                await client.query(updSQL, [idReserva, statusPagamento, 'CANCELADA']);

                if (client.query) await client.query('COMMIT');
                return true;
            } catch (e) {
                if (client.query) await client.query('ROLLBACK');
                throw e;
            }
        }
        const sql = 'UPDATE reserva SET statuspagamento = $2, metodopagamento = $3, idatendente = $4 WHERE idreserva = $1';
        await db.query(sql, [idReserva, statusPagamento, metodoPagamento, idAtendente]);
        return true;
    }

    async listarHoje() {
        // Usa prazoRetirada se existir; caso contrário, considera datareserva (criação)
        const sql = `
            SELECT r.idreserva AS idReserva, r.idcliente AS idCliente, r.datareserva AS dataReserva,
                   r.prazoretirada AS prazoRetirada, r.status, r.statuspagamento AS statusPagamento,
                   r.metodopagamento AS metodoPagamento, r.idatendente AS idAtendente,
                   u.nome AS nomeCliente,
                   COALESCE(SUM(ir.quantidade * ir.valorunitario), 0) AS totalReserva
              FROM reserva r
              JOIN usuario u ON u.id = r.idcliente
         LEFT JOIN itemreserva ir ON ir.idreserva = r.idreserva
             WHERE r.status <> 'CANCELADA'
               AND (
                     (r.prazoretirada IS NOT NULL AND DATE(r.prazoretirada) = CURRENT_DATE)
                  OR (r.prazoretirada IS NULL AND DATE(r.datareserva) = CURRENT_DATE)
               )
          GROUP BY r.idreserva, r.idcliente, r.datareserva, r.prazoretirada, r.status, r.statuspagamento, r.metodopagamento, r.idatendente, u.nome
          ORDER BY COALESCE(r.prazoretirada, r.datareserva) DESC;`;
        const { rows } = await db.query(sql);
        return rows;
    }

    async expirarVencidas() {
        // Busca reservas ATIVAS com prazo expirado
        const { rows: vencidas } = await db.query(
            `SELECT idreserva FROM reserva WHERE status = 'ATIVA' AND prazoretirada IS NOT NULL AND prazoretirada < NOW()`
        );
        if (!vencidas.length) return 0;

        const client = await db.getClient?.() || db;
        let count = 0;
        try {
            if (client.query) await client.query('BEGIN');
            for (const { idreserva } of vencidas) {
                // Devolve itens ao estoque (igual ao cancelamento)
                const { rows: itens } = await client.query(
                    'SELECT idproduto, quantidade FROM itemreserva WHERE idreserva = $1', [idreserva]
                );
                for (const it of itens) {
                    await client.query(
                        'UPDATE estoque SET quantidadeatual = quantidadeatual + $2 WHERE idproduto = $1',
                        [it.idproduto, it.quantidade]
                    );
                }
                // Marca como EXPIRADA (verifica novamente status para evitar concorrência)
                const upd = await client.query(
                    `UPDATE reserva SET status = 'EXPIRADA' WHERE idreserva = $1 AND status = 'ATIVA'`,
                    [idreserva]
                );
                if (upd.rowCount > 0) count++;
            }
            if (client.query) await client.query('COMMIT');
            return count;
        } catch (e) {
            if (client.query) await client.query('ROLLBACK');
            throw e;
        }
    }
}

module.exports = new ReservaRepository();