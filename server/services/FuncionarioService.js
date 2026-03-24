// server/services/FuncionarioService.js
// Implementaria a lógica para o pacote usuarios
const UsuarioRepository = require('../repositories/UsuarioRepository');
const bcrypt = require('bcrypt');

/**
 * Implementa a lógica de cadastro e gerenciamento de Funcionários (UC009).
 */
class FuncionarioService {
    async cadastrarFuncionario(dados) {
        // Validação: perfil deve ser um dos permitidos para funcionários
        const perfil = (dados.tipoPerfil || dados.perfil || '').toUpperCase();
        if (!['MECANICO', 'ATENDENTE', 'GERENTE', 'PROPRIETARIO'].includes(perfil)) {
            throw new Error('Perfil de funcionário inválido.');
        }

        const email = ((dados.email || '') + '').trim().toLowerCase();

        // Validações básicas
        if (!dados.nome || !email || !dados.senha) {
            throw new Error('Campos obrigatórios ausentes (nome, email, senha).');
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            throw new Error('E-mail inválido para o funcionário.');
        }

        // Hash da senha
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(dados.senha, saltRounds);

        // Monta objeto para persistência
        const toCreate = {
            nome: dados.nome,
            senha_hash: senhaHash,
            tipo_perfil: perfil,
            cpf: dados.cpf || null,
            email,
            telefone: dados.telefone || null,
            matricula: dados.matricula || null,
            trocar_senha: true
        };

        // Persiste via repositório
        const id = await UsuarioRepository.createFuncionario(toCreate);
        console.log(`[LOG] Novo funcionário ${id} (${perfil}) cadastrado.`);
        return id;
    }

    /**
     * Altera o status de ativo de um usuário (bloquear/desbloquear).
     * @param {number} userId
     * @param {boolean} isActive
     */
    async blockUser(userId, isActive = false) {
        if (!userId) throw new Error('ID do usuário inválido.');
        // Chama repositório para atualizar status
        await UsuarioRepository.updateUserStatus(userId, isActive);
        return true;
    }

    async atualizarFuncionario(id, dados) {
        const email = ((dados.email || '') + '').trim().toLowerCase();
        if (!dados.nome || !email || !dados.tipoPerfil) {
            throw new Error('Dados incompletos para atualização.');
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            throw new Error('E-mail inválido para atualização do funcionário.');
        }

        await UsuarioRepository.updateFuncionario(id, { ...dados, email });
        // Se senha fornecida, atualiza separadamente e marca trocar_senha como true
        if(dados.senha){
            const senha_hash = await bcrypt.hash(dados.senha, 10);
            await UsuarioRepository.changePassword(id, senha_hash);
            // Força trocar_senha = true quando uma nova senha é definida
            const sql = `UPDATE usuario SET trocar_senha = true WHERE id = $1`;
            const db = require('../config/database');
            await db.query(sql, [id]);
        }
        return true;
    }
}
module.exports = new FuncionarioService();