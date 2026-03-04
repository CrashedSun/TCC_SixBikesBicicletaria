// server/services/RelatorioService.js
const db = require('../config/database');

/**
 * Implementa a lógica de geração de relatórios (UC005).
 */
class RelatorioService {
    async gerarRelatorio(tipo, filtros) { // UC005, RF008
        const { dataInicio, dataFim } = filtros;
        
        // Busca reservas pagas (vendas) do banco
        const sqlVendas = `
            SELECT r.idreserva, r.datareserva, r.statuspagamento, r.metodopagamento,
                   uc.nome AS cliente, ua.nome AS atendente,
                   SUM(ir.quantidade * ir.valorunitario) AS valortotal
            FROM reserva r
            LEFT JOIN usuario uc ON r.idcliente = uc.id
            LEFT JOIN usuario ua ON r.idatendente = ua.id
            LEFT JOIN itemreserva ir ON r.idreserva = ir.idreserva
            WHERE r.datareserva::date BETWEEN $1 AND $2
                AND r.statuspagamento = 'PAGO'
            GROUP BY r.idreserva, r.datareserva, r.statuspagamento, r.metodopagamento, uc.nome, ua.nome
            ORDER BY r.datareserva DESC;
        `;
        const vendas = await db.query(sqlVendas, [dataInicio, dataFim]);
        
        // Busca agendamentos (serviços) do período
        const sqlAgendamentos = `
            SELECT a.id, a.status, a.datacriacao, a.datapagamento, a.metodopagamento,
                   s.nome AS nomeservico, s.valor,
                   uc.nome AS nomecliente, um.nome AS nomemecanico
            FROM agendamento a
            JOIN servicos s ON a.idservico = s.idservico
            LEFT JOIN usuario uc ON a.idcliente = uc.id
            LEFT JOIN usuario um ON a.idmecanico = um.id
            WHERE a.datacriacao::date BETWEEN $1 AND $2
            ORDER BY a.datacriacao DESC;
        `;
        const agendamentos = await db.query(sqlAgendamentos, [dataInicio, dataFim]);
        
        if (vendas.rows.length === 0 && agendamentos.rows.length === 0) {
            throw new Error("Nenhum registro encontrado para este período.");
        }
        
        // Calcula totais
        const valorTotalVendas = vendas.rows.reduce((acc, v) => acc + parseFloat(v.valortotal || 0), 0);
        const valorTotalServicos = agendamentos.rows
            .filter(a => a.status === 'PAGO' || a.status === 'CONCLUIDO')
            .reduce((acc, a) => acc + parseFloat(a.valor || 0), 0);
        const valorTotalGeral = valorTotalVendas + valorTotalServicos;
        
        return { 
            tipo: 'Financeiro',
            periodo: { inicio: dataInicio, fim: dataFim },
            vendas: {
                quantidade: vendas.rows.length,
                total: valorTotalVendas,
                dados: vendas.rows
            },
            servicos: {
                quantidade: agendamentos.rows.length,
                pagos: agendamentos.rows.filter(a => a.status === 'PAGO' || a.status === 'CONCLUIDO').length,
                total: valorTotalServicos,
                dados: agendamentos.rows
            },
            resumo: {
                totalVendas: valorTotalVendas,
                totalServicos: valorTotalServicos,
                totalGeral: valorTotalGeral
            },
            registros: vendas.rows.length + agendamentos.rows.length
        };
    }

    async gerarRelatorioVendas(filtros) {
        const { dataInicio, dataFim } = filtros;
        const sql = `
            SELECT r.idreserva, r.datareserva, r.statuspagamento, r.metodopagamento,
                   uc.nome AS cliente, ua.nome AS atendente,
                   SUM(ir.quantidade * ir.valorunitario) AS valortotal
            FROM reserva r
            LEFT JOIN usuario uc ON r.idcliente = uc.id
            LEFT JOIN usuario ua ON r.idatendente = ua.id
            LEFT JOIN itemreserva ir ON r.idreserva = ir.idreserva
            WHERE r.datareserva::date BETWEEN $1 AND $2
                AND r.statuspagamento = 'PAGO'
            GROUP BY r.idreserva, r.datareserva, r.statuspagamento, r.metodopagamento, uc.nome, ua.nome
            ORDER BY r.datareserva DESC;
        `;
        const result = await db.query(sql, [dataInicio, dataFim]);
        return result.rows;
    }

    async gerarRelatorioServicos(filtros) {
        const { dataInicio, dataFim } = filtros;
        const sql = `
            SELECT a.id, a.status, a.datacriacao, a.datapagamento, a.metodopagamento,
                   s.nome AS nomeservico, s.valor, s.duracaoestimada,
                   uc.nome AS nomecliente, um.nome AS nomemecanico
            FROM agendamento a
            JOIN servicos s ON a.idservico = s.idservico
            LEFT JOIN usuario uc ON a.idcliente = uc.id
            LEFT JOIN usuario um ON a.idmecanico = um.id
            WHERE a.datacriacao::date BETWEEN $1 AND $2
            ORDER BY a.datacriacao DESC;
        `;
        const result = await db.query(sql, [dataInicio, dataFim]);
        return result.rows;
    }

    async gerarRelatorioEstoque() {
        const sql = `
            SELECT p.idproduto, p.nome, p.preco, p.descricao,
                   c.nome AS categoria,
                   e.quantidadeatual
            FROM produto p
            LEFT JOIN categoria c ON p.idcategoria = c.idcategoria
            LEFT JOIN estoque e ON p.idproduto = e.idproduto
            ORDER BY p.nome;
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    async gerarRelatorioEventos(filtros) {
        const { dataInicio, dataFim } = filtros;
        let sql = `
            SELECT e.idevento, e.nome, e.data, e.vagastotal, e.vagasdisponiveis,
                   COUNT(ie.idinscricao) AS totalinscritos
            FROM evento e
            LEFT JOIN inscricaoevento ie ON e.idevento = ie.idevento
        `;
        
        const params = [];
        if (dataInicio && dataFim) {
            sql += ` WHERE e.data BETWEEN $1 AND $2`;
            params.push(dataInicio, dataFim);
        }
        
        sql += ` GROUP BY e.idevento, e.nome, e.data, e.vagastotal, e.vagasdisponiveis
                 ORDER BY e.data DESC;`;
        
        const result = await db.query(sql, params);
        return result.rows;
    }
}
module.exports = new RelatorioService();