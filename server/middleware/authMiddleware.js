// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const UsuarioRepository = require('../repositories/UsuarioRepository');

function authMiddleware(perfisPermitidos) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) { return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' }); }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        try {
            const decoded = jwt.verify(token, secret);
            // Verifica se o usuário ainda está ativo no banco
            const user = await UsuarioRepository.findById(decoded.id);
            if (!user) return res.status(401).json({ error: 'Usuário inexistente.' });
            if (user.ativo === false) return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });

            // Atualiza req.user com informações confiáveis do DB
            req.user = {
                id: user.id,
                perfil: user.tipoPerfil,
                tipoPerfil: user.tipoPerfil,
                nome: user.nome,
                email: user.email,
            };

            const userProfile = req.user.perfil.toUpperCase();
            const allowedProfiles = perfisPermitidos.map(p => p.toUpperCase());

            if (!allowedProfiles.includes(userProfile)) {
                return res.status(403).json({ error: `Permissão insuficiente. Requer: [${perfisPermitidos.join(', ')}]. Seu perfil: ${userProfile}.` });
            }
            next();
        } catch (err) { return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' }); }
    };
}
module.exports = authMiddleware;