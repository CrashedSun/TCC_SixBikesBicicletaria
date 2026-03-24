// server/controllers/AuthController.js
const AuthService = require('../services/AuthService');
const AuditoriaRepository = require('../repositories/AuditoriaRepository');

class AuthController {
    /**
     * Rota: POST /api/login
     * Efetua o login do usuário e retorna o token de acesso.
     */
    async handleLogin(req, res) {
        const { email, senha, novaSenha } = req.body;
        if (!email || !senha) { return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' }); }

        try {
            const authData = await AuthService.authenticate(email, senha);

            try {
                await AuditoriaRepository.create({
                    requestId: req.requestId,
                    nivel: 'INFO',
                    acao: 'AUTH_LOGIN_SUCCESS',
                    recurso: 'AUTH',
                    metodo: req.method,
                    rota: req.originalUrl || req.path,
                    statusCode: 200,
                    usuarioId: Number(authData.id) || null,
                    usuarioPerfil: authData.perfil || null,
                    usuarioEmail: (email || '').toString().trim().toLowerCase(),
                    ip: req.ip,
                    userAgent: req.get('user-agent') || null,
                    mensagem: 'Login realizado com sucesso.',
                    detalhes: { trocarSenha: !!authData.trocarSenha },
                });
                req.__loginAuditHandled = true;
            } catch (_) {}

            // Se for primeiro acesso e veio nova senha válida, realiza troca imediata
            if (authData.trocarSenha === true && novaSenha && novaSenha.length >= 6) {
                try {
                    await AuthService.changePassword(authData.id, novaSenha);
                    authData.trocarSenha = false; // Flag limpa após troca
                } catch (e) {
                    // Se falhar a troca de senha, ainda retorna login bem sucedido com flag para tentativa posterior
                    console.warn('Falha ao trocar senha durante login:', e.message);
                }
            }

            return res.status(200).json(authData);
        } catch (error) {
            try {
                await AuditoriaRepository.create({
                    requestId: req.requestId,
                    nivel: 'WARN',
                    acao: 'AUTH_LOGIN_FAILED',
                    recurso: 'AUTH',
                    metodo: req.method,
                    rota: req.originalUrl || req.path,
                    statusCode: 401,
                    usuarioEmail: (email || '').toString().trim().toLowerCase(),
                    ip: req.ip,
                    userAgent: req.get('user-agent') || null,
                    mensagem: error.message || 'Falha ao autenticar.',
                    detalhes: {
                        motivo: (error.message || '').toLowerCase().includes('credenciais') ? 'SENHA_OU_EMAIL_INVALIDO' : 'AUTH_ERROR'
                    },
                });
                req.__loginAuditHandled = true;
            } catch (_) {}
            return res.status(401).json({ error: error.message || 'Falha ao autenticar.' });
        }
    }

    async changePassword(req, res) {
        const userId = req.user && req.user.id;
        const { senha } = req.body;
        if (!senha || senha.length < 6) { return res.status(400).json({ error: 'Senha inválida. Mínimo 6 caracteres.' }); }
        try {
            await AuthService.changePassword(userId, senha);
            return res.status(200).json({ message: 'Senha alterada com sucesso.' });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao alterar senha.' });
        }
    }

    /**
     * Atualiza dados básicos do usuário autenticado: nome, cpf, telefone.
     */
    async updateMyBasicInfo(req, res) {
        const userId = req.user && req.user.id;
        const { nome, cpf, telefone } = req.body || {};
        if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
        if (!nome && !cpf && !telefone) {
            return res.status(400).json({ error: 'Nada para atualizar. Forneça nome, cpf ou telefone.' });
        }
        try {
            const UsuarioRepository = require('../repositories/UsuarioRepository');
            await UsuarioRepository.updateBasicInfo(userId, { nome, cpf, telefone });
            return res.status(200).json({ message: 'Dados atualizados com sucesso.' });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao atualizar dados básicos.' });
        }
    }

    async getUserInfo(req, res) {
        const userId = req.user && req.user.id;
        const UsuarioRepository = require('../repositories/UsuarioRepository');
        try {
            const usuario = await UsuarioRepository.findById(userId);
            if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
            return res.status(200).json({
                id: usuario.id,
                nome: usuario.nome,
                perfil: usuario.tipoPerfil,
                trocarSenha: usuario.trocarSenha,
                // Campos adicionais para preencher perfil
                email: usuario.email || null,
                cpf: usuario.cpf || null,
                telefone: usuario.telefone || null,
                tipoPerfil: usuario.tipoPerfil || null
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Falha ao obter informações do usuário.' });
        }
    }
}
module.exports = new AuthController();