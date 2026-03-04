// server/controllers/AgendamentoController.js
const AgendamentoService = require('../services/AgendamentoService');
class AgendamentoController {
    /** * Rota: POST /api/agendamentos/solicitar (UC006)
     * Cliente agenda serviço.
     */
    async solicitar(req, res) { 
        try {
            // O ID do cliente vem do token (req.user.id)
            const agendamento = await AgendamentoService.solicitarAgendamento(req.user.id, req.body);
            return res.status(201).json({ message: "Agendamento solicitado com sucesso." });
        } catch(e) {
             // Captura erro de peça indisponível (RF017) ou horário (UC006)
            return res.status(400).json({ error: e.message });
        }
    }
    
    /** * Rota: GET /api/agendamentos
     * Lista geral de agendamentos para funcionários.
     */
    async listarTodos(req, res) { 
        const lista = await AgendamentoService.listarAgendamentos(req.user.perfil);
        return res.status(200).json(lista);
    }
    /** * Rota: PUT /api/agendamentos/:id/executar (UC010, RF016)
     * Mecânico marca serviço como concluído.
     */
    async registrarExecucao(req, res) {
        const agendamentoId = req.params.id;
        const { pecasUsadas, observacoes } = req.body;
        const dados = { pecasUsadas, observacoes, mecanicoId: req.user.id };
        
        const resultado = await AgendamentoService.registrarExecucao(agendamentoId, dados);
        return res.status(200).json({ message: "Execução de serviço registrada.", status: resultado.status });
    }
    
    /** * Rota: POST /api/agendamentos/:id/reservar_peca (UC007)
     * Mecânico reserva peça para um agendamento específico.
     */
    async reservarPeca(req, res) {
         // O Mecânico está essencialmente fazendo uma Reserva (UC007)
         return res.status(200).json({ message: "Peça reservada para agendamento." });
    }
    // Listar Meus Agendamentos (Meus Serviços)
    async listarMeus(req, res) {
        try {
            const lista = await AgendamentoService.listarMeusAgendamentos(req.user.id);
            return res.status(200).json(lista);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }
    // Lista agendamentos abertos (sem mecânico)
    async listarAbertos(req, res) {
        const lista = await AgendamentoService.listarAbertos();
        return res.status(200).json(lista);
    }
    // Lista agendamentos em andamento para o mecânico logado
    async listarMeusAtivos(req, res) {
        const lista = await AgendamentoService.listarAtivosDoMecanico(req.user.id);
        return res.status(200).json(lista);
    }
    // Mecânico assume um agendamento
    async assumir(req, res) {
        try {
            const resultado = await AgendamentoService.assumirAgendamento(req.params.id, req.user.id);
            return res.status(200).json(resultado);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }
    // Itens usados no agendamento atual
    async listarItens(req, res) {
        try {
            const lista = await AgendamentoService.listarItens(req.params.id, req.user.id);
            return res.status(200).json(lista);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }
    async adicionarItem(req, res) {
        try {
            const result = await AgendamentoService.adicionarItemUsado(req.params.id, req.user.id, req.body || {});
            return res.status(201).json({ message: 'Item adicionado ao serviço.', id: result.id });
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }

    async removerItem(req, res) {
        try {
            await AgendamentoService.removerItemUsado(req.params.id, req.user.id, req.params.itemId);
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }

    async finalizar(req, res) {
        try {
            const resultado = await AgendamentoService.finalizarServico(req.params.id, req.user.id);
            return res.status(200).json({ success: true, status: resultado.status });
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }

    async listarParaPagamento(req, res) {
        try {
            const lista = await AgendamentoService.listarParaPagamento();
            return res.status(200).json(lista);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }

    async marcarPago(req, res) {
        try {
            const resultado = await AgendamentoService.marcarPago(req.params.id, req.body.metodoPagamento);
            return res.status(200).json({ success: true, status: resultado.status });
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }

    async listarHoje(req, res) {
        try {
            const lista = await AgendamentoService.listarHoje();
            return res.status(200).json(lista);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }
}
module.exports = new AgendamentoController();
