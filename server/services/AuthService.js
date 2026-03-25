// server/services/AuthService.js
const UsuarioRepository = require('../repositories/UsuarioRepository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PasswordResetRepository = require('../repositories/PasswordResetRepository');
const EmailService = require('./EmailService');

/**
 * Implementa a lógica de autenticação do usuário (UC001).
 */
class AuthService {
    constructor() {
        this.resetRequestLocks = new Map();
    }

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

    async requestPasswordReset(email, meta = {}) {
        const normalizedEmail = ((email || '') + '').trim().toLowerCase();
        if (!normalizedEmail) {
            throw new Error('E-mail é obrigatório.');
        }

        const lockUntil = this.resetRequestLocks.get(normalizedEmail);
        if (lockUntil && lockUntil > Date.now()) {
            return { accepted: true, deduped: true };
        }
        this.resetRequestLocks.set(normalizedEmail, Date.now() + 10000);

        try {
            const usuario = await UsuarioRepository.findByEmail(normalizedEmail);
            if (!usuario || usuario.ativo === false) {
                return { accepted: true, deduped: false };
            }

            const cooldownMinutes = Math.max(1, Number(process.env.PASSWORD_RESET_COOLDOWN_MINUTES || 2));
            const hasRecent = await PasswordResetRepository.hasRecentOpenRequest(usuario.id, cooldownMinutes);
            if (hasRecent) {
                return { accepted: true, deduped: true };
            }

            await PasswordResetRepository.invalidateOpenTokensByUser(usuario.id);

            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const ttlMinutes = Math.max(5, Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30));
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

            await PasswordResetRepository.createToken({
                usuarioId: usuario.id,
                tokenHash,
                expiresAt,
                requestIp: meta.ip,
                userAgent: meta.userAgent,
            });

            const appBase = (process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
            const resetLink = `${appBase}/redefinir-senha.html?token=${encodeURIComponent(rawToken)}`;

            await EmailService.sendPasswordResetEmail({
                to: usuario.email,
                nome: usuario.nome,
                resetLink,
                ttlMinutes,
            });

            return { accepted: true, deduped: false };
        } finally {
            setTimeout(() => {
                const current = this.resetRequestLocks.get(normalizedEmail);
                if (current && current <= Date.now()) {
                    this.resetRequestLocks.delete(normalizedEmail);
                }
            }, 11000);
        }
    }

    async confirmPasswordReset(token, newPassword) {
        if (!token || String(token).trim().length < 20) {
            throw new Error('Token inválido ou expirado.');
        }
        if (!newPassword || String(newPassword).length < 6) {
            throw new Error('Senha inválida. Mínimo 6 caracteres.');
        }

        const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
        const resetToken = await PasswordResetRepository.findValidByTokenHash(tokenHash);
        if (!resetToken) {
            throw new Error('Token inválido ou expirado.');
        }

        const usuario = await UsuarioRepository.findById(resetToken.usuarioId);
        if (!usuario || usuario.ativo === false) {
            throw new Error('Usuário inválido para redefinição de senha.');
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await UsuarioRepository.changePassword(usuario.id, hash);

        const marked = await PasswordResetRepository.markUsed(resetToken.id);
        if (!marked) {
            throw new Error('Token inválido ou já utilizado.');
        }

        await PasswordResetRepository.invalidateOpenTokensByUser(usuario.id);

        await EmailService.sendPasswordChangedEmail({ to: usuario.email, nome: usuario.nome });
        return { success: true };
    }
}
module.exports = new AuthService();