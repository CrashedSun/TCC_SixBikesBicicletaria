// server/repositories/ClienteRepository.js
const db = require('../config/database');

class ClienteRepository {
    
    /**
     * Cadastra um novo cliente na tabela Usuario.
     */
    async criarCliente(cliente) {
        // A SIMULAÇÃO FOI SUBSTITUÍDA PELA QUERY REAL
        const sql = `
            INSERT INTO Usuario (nome, senha_hash, tipo_perfil, cpf, email, telefone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const params = [
            cliente.nome, 
            cliente.senhaHash, 
            'CLIENTE', // Tipo de perfil fixo para auto-registro
            cliente.cpf, 
            cliente.email, 
            cliente.telefone
        ];

        // Aqui executamos a query correta no banco de dados real
        const result = await db.query(sql, params);
        return result.rows[0].id;
    }
    
    async listarClientes() {
        const sql = `
            SELECT id, nome, cpf, email, telefone, tipo_perfil
            FROM Usuario
            WHERE tipo_perfil = 'CLIENTE'
            ORDER BY nome;
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    async atualizarCliente(id, dados) {
        const sql = `
            UPDATE Usuario
            SET nome = $2,
                cpf = $3,
                telefone = $4
            WHERE id = $1 AND tipo_perfil = 'CLIENTE';
        `;
        await db.query(sql, [id, dados.nome, dados.cpf, dados.telefone]);
        return true;
    }
}
module.exports = new ClienteRepository();