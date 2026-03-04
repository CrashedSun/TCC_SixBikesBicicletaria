// server/services/VendaService.js
const VendaRepository = require('../repositories/VendaRepository');
const ProdutoService = require('./ProdutoService'); // Dependência para baixa no estoque (UC003)

/**
 * Implementa a lógica de registro de vendas (UC004).
 */
class VendaService {
    async registrarVenda(atendenteId, itensVenda) {
        if (itensVenda.length === 0) { throw new Error('Venda deve ter pelo menos um item.'); }
        
        let valorTotal = 0;
        
        // 1. Validar Estoque e Calcular Total (UC004)
        for (const item of itensVenda) {
            // Em produção: Deve chamar ProdutoService.movimentarEstoque ou validarEstoque em uma transação
            if (item.quantidade > 10) { throw new Error("Erro: Estoque insuficiente para o item " + item.produtoId); } // RF003/UC003
            item.precoUnitario = 50.00; 
            valorTotal += item.quantidade * item.precoUnitario;
        }

        // 2. Persistir Venda (UC004)
        const vendaModel = { valorTotal, atendenteId, itens: itensVenda };
        const vendaId = await VendaRepository.registrar(vendaModel);
        
        // 3. Persistir a baixa de estoque (RF003)
        // [Lógica real: Chamar ProdutoService.movimentarEstoque para cada item]

        return { id: vendaId, valorTotal };
    }
}
module.exports = new VendaService();