// server/controllers/VendaController.js
const VendaService = require('../services/VendaService');

class VendaController {
    /** * Rota: POST /api/vendas (UC004, RF002, RF003)
     * Atendente registra uma venda, iniciando a baixa de estoque.
     */
    async registrarVenda(req, res) {
        const atendenteId = req.user.id;
        try {
            const resultado = await VendaService.registrarVenda(atendenteId, req.body.itens);
            return res.status(201).json({ 
                message: 'Venda registrada com sucesso.', 
                venda: resultado 
            });
        } catch (error) {
            // Captura falha de estoque insuficiente (UC004 Fluxo Alternativo)
            return res.status(400).json({ error: error.message || 'Falha ao registrar a venda.' });
        }
    }
    
    /** * Rota: GET /api/vendas
     * Lista de vendas para consulta gerencial.
     */
    async listarVendas(req, res) {
        return res.status(200).json({ message: 'Lista de Vendas completa para Gerente/Proprietário.', data: [] });
    }
}
module.exports = new VendaController();