const servicosService = require('../services/ServicosService');

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
      res.status(201).json(novo);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  async atualizar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const atualizado = await servicosService.atualizar(id, req.body);
      res.json(atualizado);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  async deletar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await servicosService.deletar(id);
      res.status(204).end();
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  }
};
