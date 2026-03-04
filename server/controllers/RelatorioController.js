// server/controllers/RelatorioController.js
const RelatorioService = require('../services/RelatorioService');

class RelatorioController {
    /**
     * Rota: GET /api/relatorios/financeiro (UC005, RF008, RF014)
     * Gera relatório financeiro, podendo usar filtros via query params.
     */
    async gerarFinanceiro(req, res) {
        try {
            const filtros = req.query; // Captura filtros da URL
            const relatorio = await RelatorioService.gerarRelatorio("Financeiro", filtros);
            
            // Retorna o resultado para que o Frontend possa baixar (RF014)
            return res.status(200).json(relatorio);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    /**
     * Rota: GET /api/relatorios/vendas
     * Gera relatório de vendas por período
     */
    async gerarVendas(req, res) {
        try {
            const filtros = req.query;
            const vendas = await RelatorioService.gerarRelatorioVendas(filtros);
            const total = vendas.reduce((acc, v) => acc + parseFloat(v.valortotal || 0), 0);
            
            return res.status(200).json({
                tipo: 'Vendas',
                periodo: { inicio: filtros.dataInicio, fim: filtros.dataFim },
                registros: vendas.length,
                total: total,
                data: vendas
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    /**
     * Rota: GET /api/relatorios/servicos
     * Gera relatório de serviços/agendamentos por período
     */
    async gerarServicos(req, res) {
        try {
            const filtros = req.query;
            const servicos = await RelatorioService.gerarRelatorioServicos(filtros);
            const pagos = servicos.filter(s => s.status === 'PAGO' || s.status === 'CONCLUIDO');
            const totalPagos = pagos.reduce((acc, s) => acc + parseFloat(s.valor || 0), 0);
            
            return res.status(200).json({
                tipo: 'Serviços',
                periodo: { inicio: filtros.dataInicio, fim: filtros.dataFim },
                registros: servicos.length,
                concluidos: pagos.length,
                totalPagos: totalPagos,
                data: servicos
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    /**
     * Rota: GET /api/relatorios/estoque
     * Gera relatório de estoque atual
     */
    async gerarEstoque(req, res) {
        try {
            const produtos = await RelatorioService.gerarRelatorioEstoque();
            const totalProdutos = produtos.length;
            const totalEstoque = produtos.reduce((acc, p) => acc + parseInt(p.quantidadeatual || 0), 0);
            const valorTotal = produtos.reduce((acc, p) => acc + (parseFloat(p.preco || 0) * parseInt(p.quantidadeatual || 0)), 0);
            
            return res.status(200).json({
                tipo: 'Estoque',
                registros: totalProdutos,
                totalItens: totalEstoque,
                valorEstoque: valorTotal,
                data: produtos
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    /**
     * Rota: GET /api/relatorios/eventos
     * Gera relatório de eventos por período
     */
    async gerarEventos(req, res) {
        try {
            const filtros = req.query;
            const eventos = await RelatorioService.gerarRelatorioEventos(filtros);
            const totalInscritos = eventos.reduce((acc, e) => acc + parseInt(e.totalinscritos || 0), 0);
            
            return res.status(200).json({
                tipo: 'Eventos',
                periodo: filtros.dataInicio && filtros.dataFim ? 
                    { inicio: filtros.dataInicio, fim: filtros.dataFim } : null,
                registros: eventos.length,
                totalInscritos: totalInscritos,
                data: eventos
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
module.exports = new RelatorioController();