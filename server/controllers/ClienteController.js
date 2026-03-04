// server/controllers/ClienteController.js
const ClienteService = require('../services/ClienteService');

class ClienteController {
    /**
     * Rota: POST /api/clientes/registro
     * Permite o auto-registro de novos clientes (Tela 4 - Criação de Contas).
     */
    async handleRegistro(req, res) {
        const { nome, email, senha, cpf, telefone } = req.body;
        if (!nome || !email || !senha || !cpf) { 
             return res.status(400).json({ error: 'Nome, E-mail, Senha e CPF são obrigatórios.' }); 
        }
           if (String(senha).length < 6) {
               return res.status(400).json({ error: 'A senha deve conter pelo menos 6 caracteres.' });
           }

        try {
            const clienteId = await ClienteService.registrarNovoCliente({ nome, email, senha, cpf, telefone });
            return res.status(201).json({ message: 'Conta criada com sucesso! Faça login para acessar.', id: clienteId });
        } catch (error) {
            // Captura erro de login já existente (RF013, UC009 Fluxo Alternativo)
            return res.status(409).json({ error: error.message }); 
        }
    }

    /**
     * Rota: GET /api/clientes
     * Lista todos os clientes. Acessível por funcionários.
     */
    async listarTodos(req, res) {
        try {
            const clientes = await ClienteService.listarClientes();
            return res.status(200).json({ message: 'Lista de clientes.', data: clientes });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    async atualizar(req, res) {
        try {
            await ClienteService.atualizarCliente(req.params.id, req.body);
            return res.status(200).json({ message: 'Cliente atualizado com sucesso.' });
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }
    }
}
module.exports = new ClienteController();