// server/repositories/UsuarioRepository.js
const db = require('../config/database');
const UsuarioModel = require('../models/UsuarioModel');

/**
 * Repositório base para operações CRUD na tabela Usuario, 
 * unificando Cliente e Funcionário.
 */
class UsuarioRepository {
    
    usuarioColumns = 'id, nome, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha';

    /**
     * Busca um usuário pelo e-mail para autenticação (UC001).
     */
    async findByEmail(email) {
        const sql = `SELECT ${this.usuarioColumns} FROM usuario WHERE email = $1`;
        
        try {
            const result = await db.query(sql, [((email || '') + '').trim().toLowerCase()]); // <--- Conexão Real
            
            if (result.rows.length === 0) return null;
            
            const userDB = result.rows[0];
            
            // Mapeamento de todos os campos da tabela Usuario
            return new UsuarioModel(
                userDB.id,
                userDB.nome,
                userDB.email,
                userDB.senha_hash,
                userDB.tipo_perfil,
                userDB.cpf,
                userDB.telefone,
                userDB.matricula,
                (userDB.ativo === undefined ? true : !!userDB.ativo),
                (userDB.trocar_senha === undefined ? false : !!userDB.trocar_senha)
            );
        } catch (error) {
            // Em caso de erro de DB, lance a exceção
            console.error("ERRO NO REPOSITÓRIO:", error.message);
            throw new Error("Falha na busca de credenciais no banco.");
        }
    }

    /**
     * Busca usuário por id
     */
    async findById(id) {
        const sql = `SELECT ${this.usuarioColumns} FROM usuario WHERE id = $1`;
        try {
            const result = await db.query(sql, [id]);
            if (result.rows.length === 0) return null;
            const userDB = result.rows[0];
            return new UsuarioModel(
                userDB.id,
                userDB.nome,
                userDB.email,
                userDB.senha_hash,
                userDB.tipo_perfil,
                userDB.cpf,
                userDB.telefone,
                userDB.matricula,
                (userDB.ativo === undefined ? true : !!userDB.ativo),
                (userDB.trocar_senha === undefined ? false : !!userDB.trocar_senha)
            );
        } catch (error) {
            console.error('ERRO findById:', error.message);
            throw new Error('Falha ao buscar usuário por id.');
        }
    }
    
    /**
     * Lista todos os funcionários para consulta gerencial (UC009).
     */
    async getAllFuncionarios() {
        // SQL Real: SELECT ... WHERE tipo_perfil IN ('PROPRIETARIO', 'GERENTE', 'MECANICO', 'ATENDENTE')
        const sql = `SELECT ${this.usuarioColumns} FROM usuario WHERE tipo_perfil IN ('PROPRIETARIO', 'GERENTE', 'MECANICO', 'ATENDENTE') ORDER BY id`;
        try {
            const result = await db.query(sql);
            return result.rows.map(userDB => new UsuarioModel(
                userDB.id,
                userDB.nome,
                userDB.email,
                userDB.senha_hash,
                userDB.tipo_perfil,
                userDB.cpf,
                userDB.telefone,
                userDB.matricula,
                // Alguns bancos podem usar 'ativo' como string/boolean
                (userDB.ativo === undefined ? true : !!userDB.ativo),
                (userDB.trocar_senha === undefined ? false : !!userDB.trocar_senha)
            ));
        } catch (error) {
            console.error('ERRO AO BUSCAR FUNCIONARIOS:', error.message);
            throw new Error('Falha ao buscar funcionários no banco.');
        }
    }

    async updateUserStatus(userId, isActive) {
    // SQL Real: UPDATE Usuario SET ativo = $2 WHERE id = $1
    const sql = `UPDATE usuario SET ativo = $2 WHERE id = $1`;
    try {
        console.log(`[DB] Executando UPDATE usuario SET ativo=${isActive} WHERE id=${userId}`);
        const result = await db.query(sql, [userId, isActive]);
        console.log('[DB] updateUserStatus result.rowCount=', result.rowCount);
        if (result.rowCount === 0) {
            throw new Error('Nenhuma linha atualizada (ID pode não existir).');
        }
        return true;
    } catch (error) {
        console.error('ERRO updateUserStatus:', error.message);
        throw error;
    }
}

    /**
     * Atualiza a senha do usuário e limpa a flag de troca obrigatória.
     */
    async changePassword(userId, senha_hash) {
        const sql = `UPDATE usuario SET senha_hash = $2, trocar_senha = false WHERE id = $1`;
        try {
            const result = await db.query(sql, [userId, senha_hash]);
            if (result.rowCount === 0) throw new Error('ID de usuário não encontrado.');
            return true;
        } catch (error) {
            console.error('ERRO changePassword:', error.message);
            throw new Error('Falha ao atualizar a senha.');
        }
    }

    /**
     * Atualiza campos básicos do usuário: nome, cpf, telefone.
     */
    async updateBasicInfo(userId, { nome, cpf, telefone }) {
        const sql = `UPDATE usuario SET nome = $2, cpf = $3, telefone = $4 WHERE id = $1`;
        try {
            const result = await db.query(sql, [userId, nome || null, cpf || null, telefone || null]);
            if (result.rowCount === 0) throw new Error('ID de usuário não encontrado.');
            return true;
        } catch (error) {
            console.error('ERRO updateBasicInfo:', error.message);
            throw new Error('Falha ao atualizar dados básicos do usuário.');
        }
    }
    
    /**
     * Insere um novo funcionário na tabela usuario e retorna o id criado.
     * Recebe um objeto com: nome, email, senha_hash, tipo_perfil, cpf?, telefone?, matricula?
     */
    async createFuncionario(dados) {
        const sql = `INSERT INTO usuario (nome, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
                     VALUES ($1,$2,$3,$4,$5,$6,$7, true, true) RETURNING id`;
        const email = ((dados.email || '') + '').trim().toLowerCase();
        const params = [
            dados.nome,
            dados.senha_hash,
            dados.tipo_perfil,
            dados.cpf || null,
            email,
            dados.telefone || null,
            dados.matricula || null
        ];
        try {
            const result = await db.query(sql, params);
            return result.rows[0].id;
        } catch (error) {
            console.error('ERRO AO CRIAR FUNCIONARIO:', error.message);
            // Rejeita duplicidade de email/matricula com uma mensagem clara
            if (error.code === '23505') { // unique_violation
                throw new Error('E-mail ou matrícula já cadastrado.');
            }
            throw new Error('Falha ao criar funcionário.');
        }
    }

    async updateFuncionario(id, dados) {
        // Normaliza nome do campo (frontend envia tipoPerfil, backend usa tipo_perfil)
        const tipoPerfil = dados.tipo_perfil || dados.tipoPerfil;
        if (!tipoPerfil) {
            throw new Error('tipo_perfil é obrigatório para atualização.');
        }
        const email = ((dados.email || '') + '').trim().toLowerCase();
        const sql = `UPDATE usuario SET nome = $2, email = $3, matricula = $4, tipo_perfil = $5 WHERE id = $1`;
        const params = [id, dados.nome, email, dados.matricula, tipoPerfil];
        try {
            const result = await db.query(sql, params);
            if (result.rowCount === 0) throw new Error('Funcionário não encontrado.');
            return true;
        } catch (error) {
            console.error('ERRO AO ATUALIZAR FUNCIONARIO:', error.message);
            if (error.code === '23505') {
                throw new Error('E-mail ou matrícula já cadastrado.');
            }
            throw new Error('Falha ao atualizar funcionário.');
        }
    }
}
module.exports = new UsuarioRepository();