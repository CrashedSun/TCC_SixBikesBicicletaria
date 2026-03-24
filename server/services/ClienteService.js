// server/services/ClienteService.js
const ClienteRepository = require('../repositories/ClienteRepository');
const UsuarioRepository = require('../repositories/UsuarioRepository'); 
const ClienteModel = require('../models/ClienteModel');
const bcrypt = require('bcryptjs');

/**
 * Implementa a lógica de auto-registro de Clientes (RF013).
 */
class ClienteService {
    async registrarNovoCliente(dados) {
        
        // 1. Validação de Duplicidade (RF013 / UC009 Fluxo Alternativo)
        const usuarioExistente = await UsuarioRepository.findByEmail(dados.email);
        if (usuarioExistente) { 
            throw new Error('E-mail já cadastrado.'); 
        }

        // 2. Criptografar a Senha (Correção de Segurança RNF001)
        // Gerar um 'salt' (valor aleatório) para garantir que hashes diferentes sejam gerados para a mesma senha.
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(dados.senha, salt); 
        
        // 3. Criar o Modelo com a SENHA CRIPTOGRAFADA
        const novoCliente = new ClienteModel(
            null, 
            dados.nome, 
            dados.email, 
            senhaHash, // <--- Agora o hash está sendo passado
            dados.cpf, 
            dados.telefone
        );

        // 4. Persistir o cliente no banco
        const id = await ClienteRepository.criarCliente(novoCliente);
        return id;
    }

    async listarClientes() {
        return ClienteRepository.listarClientes();
    }

    async atualizarCliente(id, dados) {
        if (!dados.nome || !dados.cpf) {
            throw new Error('Nome e CPF são obrigatórios.');
        }
        return ClienteRepository.atualizarCliente(id, dados);
    }
}
module.exports = new ClienteService();