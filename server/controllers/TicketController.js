// server/controllers/TicketController.js
const jwt = require('jsonwebtoken');
const UsuarioRepository = require('../repositories/UsuarioRepository');
const TicketService = require('../services/TicketService');

class TicketController {
    async resolveSender(req, idTicket) {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.slice(7);
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await UsuarioRepository.findById(decoded.id);
                if (!user || user.ativo === false) throw new Error('Usuário inválido ou inativo.');
                return {
                    idUsuario: user.id,
                    nomeRemetente: user.nome || 'Usuário',
                    tipoUsuario: String(user.tipoPerfil || '').toUpperCase(),
                };
            } catch (error) {
                // Se o JWT do usuário estiver expirado ou inválido, usa o token do ticket público.
            }
        }

        const chatToken = req.headers['x-ticket-token'] || req.body?.ticketToken || req.query?.ticketToken;
        if (!chatToken) throw new Error('Token de autenticação não fornecido.');

        const decodedChat = jwt.verify(chatToken, process.env.JWT_SECRET);
        if (Number(decodedChat.ticketId) !== Number(idTicket)) throw new Error('Token de chat inválido para este ticket.');
        return {
            idUsuario: null,
            nomeRemetente: decodedChat.nome || 'Cliente',
            tipoUsuario: 'CLIENTE',
        };
    }

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

    async iniciarChat(req, res) {
        try {
            let idCliente = null;
            let nome = String(req.body?.nome || 'Cliente').trim();
            let email = String(req.body?.email || '').trim();

            const authHeader = req.headers.authorization || '';
            if (authHeader.startsWith('Bearer ')) {
                try {
                    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
                    const user = await UsuarioRepository.findById(decoded.id);
                    if (user && user.ativo !== false) {
                        idCliente = user.id;
                        nome = user.nome || nome;
                        email = user.email || email;
                    }
                } catch (_) {
                    // Ignora token inválido para manter fluxo público do chat.
                }
            }

            const assuntoResumido = String(req.body?.assunto_resumido || req.body?.assuntoResumido || '').trim();
            const mensagemInicial = String(req.body?.mensagemInicial || req.body?.mensagem || assuntoResumido).trim();
            const idTicket = await TicketService.iniciarChat({ idCliente, nome, email, assuntoResumido, mensagemInicial });

            const chatToken = jwt.sign(
                { ticketId: idTicket, nome },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );

            return res.status(201).json({
                idTicket,
                chatToken,
                message: 'Chat iniciado com sucesso.'
            });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao iniciar chat.' });
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

    async listarMeus(req, res) {
        try {
            const userId = req.user && req.user.id;
            const itens = await TicketService.listarMeusTickets(userId);
            return res.status(200).json(itens);
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao listar tickets do cliente.' });
        }
    }

    async listarDashboard(req, res) {
        try {
            const data = await TicketService.dashboard();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao carregar dashboard de tickets.' });
        }
    }

    /**
     * Rota: PUT /api/tickets/:id/assumir
     */
    async assumir(req, res) {
        try {
            const userId = req.user && req.user.id;
            const idTicket = parseInt(req.params.id, 10);
            await TicketService.assumir(idTicket, userId, {
                nomeRemetente: req.user?.nome || 'Atendente',
                tipoPerfil: req.user?.tipoPerfil || null,
            });
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
            await TicketService.fechar(idTicket, {
                nomeRemetente: req.user?.nome || 'Atendente',
                tipoPerfil: req.user?.tipoPerfil || null,
            });
            return res.status(200).json({ message: 'Ticket fechado.' });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao fechar ticket.' });
        }
    }

    async reabrir(req, res) {
        try {
            const idTicket = parseInt(req.params.id, 10);
            await TicketService.reabrir(idTicket, {
                userId: req.user?.id || null,
                nomeRemetente: req.user?.nome || 'Gerência',
                tipoPerfil: req.user?.tipoPerfil || null,
            });
            return res.status(200).json({ message: 'Ticket reaberto.' });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao reabrir ticket.' });
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

    async listarMensagens(req, res) {
        try {
            const idTicket = parseInt(req.params.id, 10);
            await this.resolveSender(req, idTicket);
            const mensagens = await TicketService.listarMensagens(idTicket);
            return res.status(200).json(mensagens);
        } catch (error) {
            return res.status(401).json({ error: error.message || 'Falha ao listar mensagens do ticket.' });
        }
    }

    async enviarMensagem(req, res) {
        try {
            const idTicket = parseInt(req.params.id, 10);
            const sender = await this.resolveSender(req, idTicket);
            const conteudo = req.body?.conteudo;
            const mensagem = await TicketService.enviarMensagem(idTicket, sender, conteudo);
            return res.status(201).json(mensagem);
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao enviar mensagem do ticket.' });
        }
    }
}
module.exports = new TicketController();