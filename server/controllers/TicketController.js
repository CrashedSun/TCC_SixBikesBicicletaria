// server/controllers/TicketController.js
const TicketService = require('../services/TicketService');

class TicketController {
    /**
     * Rota: POST /api/tickets
     * Cliente envia mensagem pela página de contato (contato.html).
     */
    async handleNewTicket(req, res) {
        try {
            const id = await TicketService.registrarTicket({
                idCliente: req.user && req.user.id ? req.user.id : null,
                nome: req.body.nome,
                email: req.body.email,
                titulo: req.body.titulo,
                mensagem: req.body.mensagem,
            });
            return res.status(201).json({ id, message: "Ticket enviado com sucesso. Aguarde resposta por e-mail." });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao enviar ticket.' });
        }
    }

    /**
     * Rota: GET /api/tickets/abertos
     * Atendente lista tickets com status 'ABERTO'
     */
    async listarAbertos(req, res) {
        try {
            const itens = await TicketService.listarAbertos();
            return res.status(200).json(itens);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao listar tickets abertos.' });
        }
    }

    /**
     * Rota: GET /api/tickets/assumidos
     * Lista tickets 'EM ATENDIMENTO' do atendente logado
     */
    async listarAssumidos(req, res) {
        try {
            const userId = req.user && req.user.id;
            const itens = await TicketService.listarAssumidos(userId);
            return res.status(200).json(itens);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao listar tickets assumidos.' });
        }
    }

    /**
     * Rota: PUT /api/tickets/:id/assumir
     */
    async assumir(req, res) {
        try {
            const userId = req.user && req.user.id;
            const idTicket = parseInt(req.params.id, 10);
            await TicketService.assumir(idTicket, userId);
            return res.status(200).json({ message: 'Ticket assumido.' });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao assumir ticket.' });
        }
    }

    /**
     * Rota: PUT /api/tickets/:id/fechar
     */
    async fechar(req, res) {
        try {
            const idTicket = parseInt(req.params.id, 10);
            await TicketService.fechar(idTicket);
            return res.status(200).json({ message: 'Ticket fechado.' });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao fechar ticket.' });
        }
    }

    async obterDetalhes(req, res) {
        try {
            const idTicket = parseInt(req.params.id, 10);
            const ticket = await TicketService.obterDetalhes(idTicket);
            return res.status(200).json(ticket);
        } catch (error) {
            return res.status(404).json({ error: error.message || 'Ticket não encontrado.' });
        }
    }
}
module.exports = new TicketController();