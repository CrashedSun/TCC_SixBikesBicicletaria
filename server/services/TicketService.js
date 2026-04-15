// server/services/TicketService.js
const TicketRepository = require('../repositories/TicketRepository');
const RealtimeService = require('./RealtimeService');

class TicketService {
    formatProfileLabel(tipoPerfil) {
        const role = String(tipoPerfil || '').toUpperCase();
        if (['GERENTE', 'PROPRIETARIO', 'ATENDENTE', 'MECANICO', 'CLIENTE'].includes(role)) {
            return role;
        }
        return 'USUARIO';
    }

    formatActorLabel(nomeRemetente, tipoPerfil) {
        const nome = String(nomeRemetente || 'Usuário').trim() || 'Usuário';
        const perfil = this.formatProfileLabel(tipoPerfil);
        return `${nome} (${perfil})`;
    }

    async ensureSchema() {
        await TicketRepository.ensureSchema();
    }

    async registrarTicket(dados) {
        if (!dados || !dados.mensagem) { throw new Error("A mensagem do ticket é obrigatória."); }
        if (!dados.titulo) { throw new Error("O título do ticket é obrigatório."); }
        // nome e email podem ser opcionais, mas recomendados
        const id = await TicketRepository.create({ idCliente: dados.idCliente, nome: dados.nome, email: dados.email, titulo: dados.titulo, mensagem: dados.mensagem });
        return id;
    }

    async iniciarChat(dados) {
        const assunto = String(dados?.assuntoResumido || '').trim();
        const mensagemInicial = String(dados?.mensagemInicial || assunto).trim();
        if (!assunto) throw new Error('Assunto do chat é obrigatório.');
        if (!mensagemInicial) throw new Error('Mensagem inicial é obrigatória.');

        const idTicket = await TicketRepository.createChatTicket({
            idCliente: dados?.idCliente || null,
            nome: dados?.nome || 'Cliente',
            email: dados?.email || null,
            assuntoResumido: assunto,
            mensagemInicial,
        });

        await TicketRepository.addMessage(idTicket, {
            idUsuario: dados?.idCliente || null,
            nomeRemetente: dados?.nome || 'Cliente',
            tipoUsuario: 'CLIENTE',
            conteudo: mensagemInicial,
        });

        const nomeCliente = dados?.nome || 'Cliente';
        RealtimeService.publish('ticket.aberto', {
            idTicket,
            assunto,
            assunto_resumido: assunto,
            nome: nomeCliente,
            nomeCliente,
        });
        RealtimeService.publish('ticket.message.novo', {
            idTicket,
            tipo_usuario: 'CLIENTE',
            nome_usuario: nomeCliente,
            nome_remetente: nomeCliente,
            conteudo: mensagemInicial,
            preview: mensagemInicial,
        });
        return idTicket;
    }

    async listarAbertos() {
        return await TicketRepository.listByStatus('ABERTO');
    }

    async listarAssumidos(funcionarioId) {
        return await TicketRepository.listAssignedTo(funcionarioId);
    }

    async assumir(idTicket, funcionarioId, options = {}) {
        const nomeRemetente = String(options?.nomeRemetente || 'Atendente').trim() || 'Atendente';
        const actorLabel = this.formatActorLabel(nomeRemetente, options?.tipoPerfil);
        const mensagemAssumido = `O ticket número #${idTicket} foi assumido por ${actorLabel}.`;

        const ok = await TicketRepository.assignWithSystemMessage(idTicket, funcionarioId, mensagemAssumido);
        if (!ok) throw new Error('Não foi possível assumir o ticket (talvez já assumido).');
        RealtimeService.publish('ticket.assumido', {
            idTicket,
            id_atendente: funcionarioId,
            tipo_usuario: 'SISTEMA',
            nome_remetente: 'Sistema',
            conteudo: mensagemAssumido,
        });
        return true;
    }

    async fechar(idTicket, options = {}) {
        const nomeRemetente = String(options?.nomeRemetente || 'Atendente').trim() || 'Atendente';
        const actorLabel = this.formatActorLabel(nomeRemetente, options?.tipoPerfil);
        const mensagemEncerramento = `O ticket número #${idTicket} foi encerrado por ${actorLabel}.`;
        const ok = await TicketRepository.closeWithSystemMessage(idTicket, mensagemEncerramento);
        if (!ok) throw new Error('Não foi possível fechar o ticket.');
        RealtimeService.publish('ticket.fechado', {
            idTicket,
            tipo_usuario: 'SISTEMA',
            nome_remetente: 'Sistema',
            conteudo: mensagemEncerramento,
        });
        return true;
    }

    async reabrir(idTicket, options = {}) {
        const nomeRemetente = String(options?.nomeRemetente || 'Gerência').trim() || 'Gerência';
        const actorLabel = this.formatActorLabel(nomeRemetente, options?.tipoPerfil);
        const mensagemReabertura = `O ticket número #${idTicket} foi reaberto por ${actorLabel}.`;
        const ok = await TicketRepository.reopenWithSystemMessage(idTicket, mensagemReabertura);
        if (!ok) throw new Error('Não foi possível reabrir o ticket.');
        RealtimeService.publish('ticket.reaberto', {
            idTicket,
            id_usuario_reabertura: options?.userId || null,
            tipo_usuario: 'SISTEMA',
            nome_remetente: 'Sistema',
            conteudo: mensagemReabertura,
        });
        return true;
    }

    async listarMeusTickets(idCliente) {
        if (!idCliente) throw new Error('Usuário cliente não identificado.');
        return TicketRepository.listByClient(idCliente);
    }

    async dashboard() {
        return TicketRepository.getDashboard();
    }

    async listarMensagens(idTicket) {
        const ticket = await TicketRepository.getById(idTicket);
        if (!ticket) throw new Error('Ticket não encontrado.');
        return TicketRepository.listMessages(idTicket);
    }

    async enviarMensagem(idTicket, sender, conteudo) {
        const ticket = await TicketRepository.getById(idTicket);
        if (!ticket) throw new Error('Ticket não encontrado.');

        const texto = String(conteudo || '').trim();
        if (!texto) throw new Error('Conteúdo da mensagem é obrigatório.');

        const tipo = String(sender?.tipoUsuario || '').toUpperCase();
        if (!['CLIENTE', 'ATENDENTE', 'GERENTE', 'PROPRIETARIO'].includes(tipo)) {
            throw new Error('Tipo de usuário não permitido para mensagem.');
        }

        if (ticket.status === 'FECHADO') {
            throw new Error('Ticket fechado. Reabra para enviar novas mensagens.');
        }

        const msg = await TicketRepository.addMessage(idTicket, {
            idUsuario: sender?.idUsuario || null,
            nomeRemetente: String(sender?.nomeRemetente || 'Usuário').slice(0, 120),
            tipoUsuario: tipo,
            conteudo: texto,
        });

        RealtimeService.publish('ticket.message.novo', {
            idTicket,
            id_usuario: msg.idusuario,
            nome_usuario: msg.nome_remetente,
            nome_remetente: msg.nome_remetente,
            tipo_usuario: msg.tipo_usuario,
            conteudo: msg.conteudo,
            preview: msg.conteudo,
            criado_em: msg.criado_em,
        });

        return msg;
    }

    async obterDetalhes(idTicket) {
        const ticket = await TicketRepository.getById(idTicket);
        if (!ticket) throw new Error('Ticket não encontrado.');
        return ticket;
    }
}
module.exports = new TicketService();