// server/services/TicketService.js
const TicketRepository = require('../repositories/TicketRepository');

class TicketService {
    async registrarTicket(dados) {
        if (!dados || !dados.mensagem) { throw new Error("A mensagem do ticket é obrigatória."); }
        if (!dados.titulo) { throw new Error("O título do ticket é obrigatório."); }
        // nome e email podem ser opcionais, mas recomendados
        const id = await TicketRepository.create({ idCliente: dados.idCliente, nome: dados.nome, email: dados.email, titulo: dados.titulo, mensagem: dados.mensagem });
        return id;
    }

    async listarAbertos() {
        return await TicketRepository.listByStatus('ABERTO');
    }

    async listarAssumidos(funcionarioId) {
        return await TicketRepository.listAssignedTo(funcionarioId);
    }

    async assumir(idTicket, funcionarioId) {
        const ok = await TicketRepository.assignTo(idTicket, funcionarioId);
        if (!ok) throw new Error('Não foi possível assumir o ticket (talvez já assumido).');
        return true;
    }

    async fechar(idTicket) {
        const ok = await TicketRepository.close(idTicket);
        if (!ok) throw new Error('Não foi possível fechar o ticket.');
        return true;
    }

    async obterDetalhes(idTicket) {
        const ticket = await TicketRepository.getById(idTicket);
        if (!ticket) throw new Error('Ticket não encontrado.');
        return ticket;
    }
}
module.exports = new TicketService();