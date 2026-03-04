const ReservaRepository = require('../repositories/ReservaRepository');

class ReservaService {
  async criarReserva({ clienteId, prazoRetirada, itens }) {
    if (!clienteId) throw new Error('Cliente inválido.');
    if (!Array.isArray(itens) || itens.length === 0) throw new Error('Itens obrigatórios.');
    const clienteIdNum = parseInt(clienteId, 10);
    return await ReservaRepository.criarReservaComItens({ clienteId: clienteIdNum, prazoRetirada, itens });
  }

  async listarPendentes() { return await ReservaRepository.listarPorStatusPagamento('PENDENTE'); }

  async atualizarItens(idReserva, itens) {
    if (!idReserva) throw new Error('Reserva inválida.');
    if (!Array.isArray(itens)) throw new Error('Formato de itens inválido.');
    await ReservaRepository.substituirItens(idReserva, itens);
  }

  async marcarPaga(idReserva, atendenteId, metodoPagamento) {
    const valid = ['PIX','DINHEIRO','CREDITO','DEBITO'];
    if (!valid.includes((metodoPagamento||'').toUpperCase())) throw new Error('Método de pagamento inválido.');
    await ReservaRepository.atualizarPagamento(idReserva, 'PAGO', metodoPagamento.toUpperCase(), atendenteId);
  }

  async cancelar(idReserva) { await ReservaRepository.atualizarPagamento(idReserva, 'CANCELADO', null, null, true); }

  async obterDetalhe(idReserva) {
    if (!idReserva) throw new Error('Reserva inválida.');
    const det = await ReservaRepository.obterPorIdComItens(idReserva);
    if (!det) throw new Error('Reserva não encontrada.');
    return det;
  }

  async listarHoje() { return await ReservaRepository.listarHoje(); }
}

module.exports = new ReservaService();