const servicosService = require('../services/ServicosService');
const RealtimeService = require('../services/RealtimeService');

module.exports = {
  async listar(req, res) {
    try {
      const data = req.query.sort === 'mais-vendidos'
        ? await servicosService.listarMaisVendidos(req.query.limit)
        : await servicosService.listar();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
  async obter(req, res) {
    try {
      const item = await servicosService.obter(parseInt(req.params.id, 10));
      res.json(item);
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  },
  async criar(req, res) {
    try {
      const novo = await servicosService.criar(req.body);
      RealtimeService.publish('servico.criado', { id: novo?.idservico, scope: 'servicos' });
      res.status(201).json(novo);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  async atualizar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const atualizado = await servicosService.atualizar(id, req.body);
      RealtimeService.publish('servico.atualizado', { id, scope: 'servicos' });
      res.json(atualizado);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  async deletar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await servicosService.deletar(id);
      RealtimeService.publish('servico.deletado', { id, scope: 'servicos' });
      res.status(204).end();
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  }
};
