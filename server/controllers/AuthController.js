// server/controllers/AuthController.js
const AuthService = require('../services/AuthService');

class AuthController {
    /**
     * Rota: POST /api/login
     * Efetua o login do usuário e retorna o token de acesso.
     */
    async handleLogin(req, res) {
        const { login, senha, novaSenha } = req.body;
        if (!login || !senha) { return res.status(400).json({ error: 'Login e senha são obrigatórios.' }); }

        try {
            const authData = await AuthService.authenticate(login, senha);

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
                login: usuario.login,
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