// server/repositories/VendaRepository.js
const db = require('../config/database');

class VendaRepository {
    
    // Simula a transação no banco (Venda e ItensVenda - UC004)
    async registrar(vendaModel) {
        // SQL Real: Inicia transação, INSERT INTO Venda, INSERT INTO ItemVenda, COMMIT
        const newId = Math.floor(Math.random() * 2000) + 100;
        console.log(`[DB] Venda ${newId} (Total: ${vendaModel.valorTotal}) registrada com ${vendaModel.itens.length} itens.`);
        return newId;
    }
    
    // Simula a busca de vendas para relatórios (UC005)
    async findByPeriod(dataInicio, dataFim) {
        // SQL Real: SELECT * FROM Venda WHERE data BETWEEN $1 AND $2
        return [
            { id: 101, data: '2025-11-25', valorTotal: 150.00 },
            { id: 102, data: '2025-11-26', valorTotal: 300.50 }
        ];
    }
}
module.exports = new VendaRepository();