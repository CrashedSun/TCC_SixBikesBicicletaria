const ReservaService = require('../services/ReservaService');

class ReservaController {
  // Cliente finaliza reserva (cria cabeçalho + itens) / Atendente cria reserva de balcão
  async criar(req, res) {
    try {
      // Se for atendente/admin criando reserva de balcão, clienteId vem no body
      // Se for cliente, usa o id do token
      let clienteId;
      
      if (['ATENDENTE', 'GERENTE', 'PROPRIETARIO'].includes(req.user.perfil)) {
        // Atendente criando reserva de balcão - DEVE usar clienteId do body
        clienteId = parseInt(req.body.clienteId, 10);
        if (!clienteId || isNaN(clienteId)) {
          return res.status(400).json({ error: 'clienteId é obrigatório para criar reserva de balcão.' });
        }
      } else {
        // Cliente criando para si mesmo
        clienteId = parseInt(req.user.id, 10);
      }
      
      const { itens, prazoRetirada } = req.body; // itens: [{idProduto, quantidade, valorUnitario}]
      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Itens da reserva são obrigatórios.' });
      }
      const idReserva = await ReservaService.criarReserva({ clienteId, prazoRetirada, itens });
      return res.status(201).json({ idReserva });
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Falha ao criar reserva.' });
    }
  }

  // Lista reservas do próprio cliente
  async listarMinhas(req, res) {
    try {
      const lista = await ReservaService.listarMinhas(req.user.id);
      return res.status(200).json(lista);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Lista reservas pendentes pagamento para atendente
  async listarPendentes(req, res) {
    try {
      const lista = await ReservaService.listarPendentes();
      return res.status(200).json({ data: lista });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Adiciona/atualiza itens em uma reserva antes do pagamento
  async atualizarItens(req, res) {
    try {
      const { id } = req.params;
      const { itens } = req.body; // substituir conjunto inteiro de itens
      await ReservaService.atualizarItens(Number(id), itens);
      return res.status(200).json({ message: 'Itens atualizados.' });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  // Marca como paga no balcão e registra atendente + método
  async marcarPaga(req, res) {
    try {
      const { id } = req.params;
      const atendenteId = req.user.id;
      const { metodoPagamento } = req.body; // PIX, DINHEIRO, CREDITO, DEBITO
      await ReservaService.marcarPaga(Number(id), atendenteId, metodoPagamento);
      return res.status(200).json({ message: 'Reserva marcada como PAGA.' });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  // Cancela reserva
  async cancelar(req, res) {
      try {
        const { id } = req.params;
        await ReservaService.cancelar(Number(id));
        return res.status(200).json({ message: 'Reserva cancelada.' });
      } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  // Obtém detalhes da reserva (cabeçalho + itens)
  async obter(req, res) {
    try {
      const { id } = req.params;
      const det = await ReservaService.obterDetalhe(Number(id));
      return res.status(200).json({ data: det });
    } catch (e) { return res.status(404).json({ error: e.message }); }
  }

  async listarHoje(req, res) {
    try {
      const lista = await ReservaService.listarHoje();
      return res.status(200).json(lista);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
}

module.exports = new ReservaController();