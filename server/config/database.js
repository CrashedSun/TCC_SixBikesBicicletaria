// server/config/database.js - CÓDIGO FINAL PARA CONEXÃO REAL
const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' }); 

class DatabaseConfig {
    constructor() {
        if (!DatabaseConfig.instance) {
            this.pool = new Pool({
                user: process.env.DB_USER, 
                host: process.env.DB_HOST,
                database: process.env.DB_NAME, 
                password: process.env.DB_PASSWORD, 
                port: process.env.DB_PORT,
            });
            DatabaseConfig.instance = this;
        }
        return DatabaseConfig.instance;
    }
    
    // Agora o método query tenta a conexão real com o PostgreSQL
    async query(sql, params) {
        try {
            const res = await this.pool.query(sql, params);
            return res;
        } catch (error) {
            console.error('ERRO CRÍTICO NO DB:', error.stack, 'SQL:', sql);
            // Lança o erro para ser capturado no index.js ou na camada Repository
            throw new Error(`Falha na comunicação com o banco de dados. Verifique a instância do PostgreSQL. Detalhes: ${error.message}`);
        }
    }
}
module.exports = new DatabaseConfig();