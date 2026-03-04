// server/services/EventoService.js
const EventoRepository = require('../repositories/EventoRepository');
const InscricaoEventoRepository = require('../repositories/InscricaoEventoRepository');

class EventoService {
  async criarEvento(dados) {
    const { nome, data, vagasTotal } = dados || {};
    if (!nome || String(nome).trim().length < 3) throw new Error('Nome do evento inválido.');
    if (!data) throw new Error('Data do evento é obrigatória.');
    const dataStr = String(data).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) throw new Error('Data do evento inválida (formato esperado YYYY-MM-DD).');
    const hojeISO = new Date().toISOString().split('T')[0];
    // Permite hoje ou futuro
    if (dataStr < hojeISO) throw new Error('Data do evento não pode ser no passado.');
    const vt = Number(vagasTotal);
    if (!vt || vt <= 0) throw new Error('Vagas totais devem ser maior que zero.');
    return await EventoRepository.criar({ nome: nome.trim(), data: dataStr, vagasTotal: vt });
  }

  async listarEventos() {
    const lista = await EventoRepository.listarTodos();
    const hojeDate = new Date().toISOString().split('T')[0];
    return lista.map(e => {
      // Converte data do DB para string YYYY-MM-DD se for Date object
      const dataStr = e.data instanceof Date ? e.data.toISOString().split('T')[0] : String(e.data);
      const passado = dataStr < hojeDate;
      const hoje = dataStr === hojeDate;
      return { ...e, data: dataStr, passado, hoje };
    });
  }

  async inscreverCliente(idEvento, idCliente) {
    const ideventoNum = Number(idEvento);
    if (!ideventoNum) throw new Error('ID de evento inválido.');
    const idclienteNum = Number(idCliente);
    if (!idclienteNum) throw new Error('ID de cliente inválido.');
    return await InscricaoEventoRepository.inscrever(ideventoNum, idclienteNum);
  }

  async listarInscritos(idEvento) {
    const ideventoNum = Number(idEvento);
    if (!ideventoNum) throw new Error('ID de evento inválido.');
    return await InscricaoEventoRepository.listarPorEvento(ideventoNum);
  }
}

module.exports = new EventoService();