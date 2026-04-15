const ConhecimentoTicketRepository = require('../repositories/ConhecimentoTicketRepository');

class ConhecimentoTicketService {
    validate(payload) {
        const titulo = String(payload?.titulo || '').trim();
        const descricao = String(payload?.descricao || '').trim();
        const tags = payload?.tags ? String(payload.tags).trim().slice(0, 500) : null;
        const ativo = payload?.ativo === undefined ? true : Boolean(payload.ativo);

        if (!titulo) throw new Error('Titulo é obrigatório.');
        if (!descricao) throw new Error('Descricao é obrigatória.');

        return {
            titulo: titulo.slice(0, 255),
            descricao,
            tags,
            ativo,
        };
    }

    async listar() {
        return ConhecimentoTicketRepository.list();
    }

    async obter(id) {
        const item = await ConhecimentoTicketRepository.getById(id);
        if (!item) throw new Error('Conhecimento não encontrado.');
        return item;
    }

    async criar(payload) {
        const dados = this.validate(payload || {});
        const id = await ConhecimentoTicketRepository.create(dados);
        return { id };
    }

    async atualizar(id, payload) {
        const dados = this.validate(payload || {});
        const ok = await ConhecimentoTicketRepository.update(id, dados);
        if (!ok) throw new Error('Conhecimento não encontrado.');
        return true;
    }

    async remover(id) {
        const ok = await ConhecimentoTicketRepository.remove(id);
        if (!ok) throw new Error('Conhecimento não encontrado.');
        return true;
    }
}

module.exports = new ConhecimentoTicketService();
