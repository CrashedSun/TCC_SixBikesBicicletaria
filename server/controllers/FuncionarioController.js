// server/controllers/FuncionarioController.js
const FuncionarioService = require('../services/FuncionarioService');
const UsuarioRepository = require('../repositories/UsuarioRepository');

class FuncionarioController {
    /**
     * Rota: GET /api/funcionarios
     * Lista todos os funcionários. (Acessível por Gerente/Proprietário - UC009)
     */
    async listarTodos(req, res) {
        const funcionarios = await UsuarioRepository.getAllFuncionarios();
        return res.status(200).json(funcionarios);
    }
    
    /**
     * Rota: POST /api/funcionarios
     * Cadastra um novo funcionário. (Acessível por Proprietário - RF010)
     */
    async cadastrar(req, res) {
        try {
             const id = await FuncionarioService.cadastrarFuncionario(req.body);
             return res.status(201).json({ id, message: "Funcionário cadastrado com sucesso." });
        } catch(e) { 
            return res.status(409).json({ error: e.message }); 
        }
    }

    /**
     * Rota: PUT /api/funcionarios/:id/bloquear
     * Bloqueia o acesso de um usuário (UC009).
     */
    async blockUserAccess(req, res) {
        const userIdToBlock = parseInt(req.params.id);
        
        try {
            // Verificação de segurança (Impede que um usuário se bloqueie)
            if (req.user.id === userIdToBlock) {
                 return res.status(403).json({ error: "Você não pode bloquear sua própria conta." });
            }
            
            // lê o estado desejado enviado pelo frontend (isActive: true => ativo)
            const isActive = (req.body && typeof req.body.isActive !== 'undefined') ? !!req.body.isActive : false;
            await FuncionarioService.blockUser(userIdToBlock, isActive);
            return res.status(200).json({ message: "Status do usuário atualizado com sucesso.", id: userIdToBlock, ativo: isActive });
        } catch (error) {
            return res.status(500).json({ error: error.message || "Falha ao bloquear usuário." });
        }
    }

    async buscarPorId(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const func = await UsuarioRepository.findById(id);
            if (!func) return res.status(404).json({ error: 'Funcionário não encontrado.' });
            return res.status(200).json(func);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao buscar funcionário.' });
        }
    }

    async atualizar(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            await FuncionarioService.atualizarFuncionario(id, req.body);
            return res.status(200).json({ message: 'Funcionário atualizado com sucesso.' });
        } catch (error) {
            return res.status(400).json({ error: error.message || 'Falha ao atualizar funcionário.' });
        }
    }
}
module.exports = new FuncionarioController();