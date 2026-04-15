const ConhecimentoTicketService = require('../services/ConhecimentoTicketService');

class ConhecimentoTicketController {
    async listar(req, res) {
        try {
            const itens = await ConhecimentoTicketService.listar();
            return res.status(200).json(itens);
        } catch (e) {
            return res.status(500).json({ error: e.message || 'Falha ao listar conhecimentos.' });
        }
    }

    async obter(req, res) {
        try {
            const id = Number(req.params.id);
            const item = await ConhecimentoTicketService.obter(id);
            return res.status(200).json(item);
        } catch (e) {
            return res.status(404).json({ error: e.message || 'Conhecimento não encontrado.' });
        }
    }

    async criar(req, res) {
        try {
            const result = await ConhecimentoTicketService.criar(req.body || {});
            return res.status(201).json({ message: 'Conhecimento criado com sucesso.', ...result });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Falha ao criar conhecimento.' });
        }
    }

    async atualizar(req, res) {
        try {
            const id = Number(req.params.id);
            await ConhecimentoTicketService.atualizar(id, req.body || {});
            return res.status(200).json({ message: 'Conhecimento atualizado com sucesso.' });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Falha ao atualizar conhecimento.' });
        }
    }

    async remover(req, res) {
        try {
            const id = Number(req.params.id);
            await ConhecimentoTicketService.remover(id);
            return res.status(200).json({ message: 'Conhecimento removido com sucesso.' });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Falha ao remover conhecimento.' });
        }
    }
}

module.exports = new ConhecimentoTicketController();
