// server/controllers/EventoController.js
const EventoService = require('../services/EventoService');

class EventoController {
  async criar(req, res) {
    try {
      const evento = await EventoService.criarEvento(req.body || {});
      return res.status(201).json({ message: 'Evento criado com sucesso.', evento });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  async listar(req, res) {
    try {
      const lista = await EventoService.listarEventos();
      return res.status(200).json(lista);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  async inscrever(req, res) {
    try {
      const idEvento = req.params.id;
      const idCliente = req.user?.id;
      const result = await EventoService.inscreverCliente(idEvento, idCliente);
      return res.status(201).json(result);
    } catch (e) {
      const msg = e.message || 'Falha ao inscrever.';
      const code = /não encontrado|inválido|lotado|já ocorreu|já está inscrito/i.test(msg) ? 400 : 500;
      return res.status(code).json({ error: msg });
    }
  }

  async listarInscritos(req, res) {
    try {
      const idEvento = req.params.id;
      const lista = await EventoService.listarInscritos(idEvento);
      return res.status(200).json(lista);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }
}

module.exports = new EventoController();