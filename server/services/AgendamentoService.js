// server/services/AgendamentoService.js
const AgendamentoRepository = require('../repositories/AgendamentoRepository');
const ProdutoService = require('./ProdutoService');

/**
 * Implementa a lógica de agendamento de serviços (UC006) e execução (UC010).
 */
class AgendamentoService {
    async solicitarAgendamento(clienteId, dados) { // UC006, RF005
        // Validação: dataAgendada deve ser >= agora
        if (!dados.idservico) {
            throw new Error('Serviço inválido.');
        }
        if (!dados.dataAgendada) {
            throw new Error('Data do agendamento é obrigatória.');
        }
        const agendada = new Date(dados.dataAgendada);
        const agora = new Date();
        if (isNaN(agendada.getTime())) {
            throw new Error('Data do agendamento inválida.');
        }
        if (agendada.getTime() < agora.getTime()) {
            throw new Error('A data do agendamento deve ser igual ou posterior ao momento atual.');
        }

        const agendamentoData = { clienteId, idservico: dados.idservico, dataAgendada: dados.dataAgendada, observacoes: dados.observacoes, status: 'ABERTO' };
        const id = await AgendamentoRepository.create(agendamentoData);
        
        // Em produção: Envio de notificação (RF006)
        
        return { id, message: "Serviço agendado com sucesso." };
    }
    
    async listarAgendamentos(perfil) { // UC010
        return AgendamentoRepository.findByCriteria({ perfil });
    }

    async listarMeusAgendamentos(clienteId) {
        return await AgendamentoRepository.findByCliente(clienteId);
    }

    async listarAbertos() {
        return await AgendamentoRepository.findAbertos();
    }

    async listarAtivosDoMecanico(mecanicoId) {
        return await AgendamentoRepository.findAtivosDoMecanico(mecanicoId);
    }

    async assumirAgendamento(agendamentoId, mecanicoId) {
        if (!agendamentoId) throw new Error('ID de agendamento é obrigatório.');
        return await AgendamentoRepository.assumir(agendamentoId, mecanicoId);
    }

    async listarItens(agendamentoId, mecanicoId) {
        const ag = await AgendamentoRepository.findById(agendamentoId);
        if (!ag) throw new Error('Agendamento não encontrado.');
        if (ag.idmecanico && ag.idmecanico !== mecanicoId) throw new Error('Sem permissão para acessar este agendamento.');
        return await AgendamentoRepository.listarItens(agendamentoId);
    }

    async adicionarItemUsado(agendamentoId, mecanicoId, { idproduto, quantidade }) {
        idproduto = Number(idproduto); quantidade = Number(quantidade);
        if (!idproduto || !quantidade || quantidade <= 0) throw new Error('Produto e quantidade válidos são obrigatórios.');
        const ag = await AgendamentoRepository.findById(agendamentoId);
        if (!ag) throw new Error('Agendamento não encontrado.');
        if (ag.status !== 'EM ANDAMENTO') throw new Error('Somente agendamentos EM ANDAMENTO permitem uso de peças.');
        if (!ag.idmecanico || ag.idmecanico !== mecanicoId) throw new Error('Você não assumiu este agendamento.');
        // Debita estoque com validação
        await ProdutoService.movimentarEstoque(idproduto, 'SAIDA', quantidade);
        // Registra uso
        const itemId = await AgendamentoRepository.addItemUsado(agendamentoId, ag.idservico, idproduto, quantidade);
        return { id: itemId };
    }

    async removerItemUsado(agendamentoId, mecanicoId, itemId) {
        agendamentoId = Number(agendamentoId);
        itemId = Number(itemId);
        console.log('[removerItemUsado] agendamentoId:', agendamentoId, 'mecanicoId:', mecanicoId, 'itemId:', itemId);
        if (!agendamentoId || !itemId) throw new Error('Parâmetros inválidos.');
        const ag = await AgendamentoRepository.findById(agendamentoId);
        console.log('[removerItemUsado] agendamento:', ag);
        if (!ag) throw new Error('Agendamento não encontrado.');
        if (ag.status !== 'EM ANDAMENTO') throw new Error('Somente agendamentos EM ANDAMENTO permitem remoção de peças.');
        if (!ag.idmecanico || ag.idmecanico !== mecanicoId) throw new Error('Você não assumiu este agendamento.');

        const item = await AgendamentoRepository.getItem(itemId);
        console.log('[removerItemUsado] item:', item, 'comparing:', item?.idagendamento, 'with:', agendamentoId);
        if (!item) throw new Error('Item não encontrado.');
        if (Number(item.idagendamento) !== Number(agendamentoId)) throw new Error('Item não pertence a este agendamento.');

        // Devolve ao estoque
        console.log('[removerItemUsado] devolvendo ao estoque:', item.idproduto, item.quantidade);
        await ProdutoService.movimentarEstoque(item.idproduto, 'ENTRADA', item.quantidade);
        // Remove item
        const ok = await AgendamentoRepository.deleteItem(itemId, agendamentoId);
        console.log('[removerItemUsado] deleteItem result:', ok);
        if (!ok) throw new Error('Falha ao remover item.');
        return true;
    }

    async finalizarServico(agendamentoId, mecanicoId) {
        agendamentoId = Number(agendamentoId);
        if (!agendamentoId) throw new Error('ID de agendamento inválido.');
        const resultado = await AgendamentoRepository.finalizarServico(agendamentoId, mecanicoId);
        if (!resultado) throw new Error('Não foi possível finalizar o serviço. Verifique se está EM ANDAMENTO e atribuído a você.');
        return resultado;
    }

    async listarParaPagamento() {
        return await AgendamentoRepository.findParaPagamento();
    }

    async marcarPago(agendamentoId, metodoPagamento) {
        agendamentoId = Number(agendamentoId);
        if (!agendamentoId) throw new Error('ID de agendamento inválido.');
        if (!metodoPagamento) throw new Error('Método de pagamento é obrigatório.');
        const resultado = await AgendamentoRepository.marcarPago(agendamentoId, metodoPagamento);
        if (!resultado) throw new Error('Não foi possível marcar como pago. Verifique se está PARA PAGAMENTO.');
        return resultado;
    }
    
    async registrarExecucao(agendamentoId, dados) { // UC010, RF016
        // Em produção: Deve chamar ProdutoService.movimentarEstoque para as peças usadas
        const resultado = await AgendamentoRepository.updateExecutionStatus(agendamentoId, dados);
        return { status: "CONCLUIDO" };
    }

    async listarHoje() {
        return await AgendamentoRepository.findHoje();
    }
}
module.exports = new AgendamentoService();