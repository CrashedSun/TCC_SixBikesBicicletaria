// server/services/AuthService.js
const UsuarioRepository = require('../repositories/UsuarioRepository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Implementa a lógica de autenticação do usuário (UC001).
 */
class AuthService {
    async authenticate(email, senha) { // UC001
        const usuario = await UsuarioRepository.findByEmail(email);
        if (!usuario) { throw new Error('Credenciais inválidas'); }
        
        // 🚨 Comparação de Hash (Corrige o RNF001 na autenticação)
        const isPasswordValid = await bcrypt.compare(senha, usuario.senhaHash);
        
        if (!isPasswordValid) { throw new Error('Credenciais inválidas'); }

        // Impede login de usuários bloqueados
        if (usuario.ativo === false) {
            throw new Error('Conta bloqueada. Contate o administrador.');
        }

        // Geração do JWT
        const payload = { id: usuario.id, perfil: usuario.tipoPerfil };
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secret, { expiresIn: '8h' });
        
        // Inclui o id do usuário para permitir ações imediatas (ex: troca de senha no login)
        return { id: usuario.id, token, perfil: usuario.tipoPerfil, nome: usuario.nome, trocarSenha: usuario.trocarSenha };
    }

    async changePassword(userId, newPassword) {
        const UsuarioRepository = require('../repositories/UsuarioRepository');
        const hash = await bcrypt.hash(newPassword, 10);
        return await UsuarioRepository.changePassword(userId, hash);
    }
}
module.exports = new AuthService();