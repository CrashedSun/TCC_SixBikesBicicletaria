// server/config/database.js - CÓDIGO FINAL PARA CONEXÃO REAL
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); 

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

            this._rawPoolQuery = this.pool.query.bind(this.pool);
            this._inFlightProcessMap = new Map();
            this._processHistory = [];
            this._maxHistoryEntries = 300;

            // Envolve a query da pool para garantir rastreio/processamento centralizado.
            this.pool.query = (sql, params) => {
                return this.query(sql, params, { source: 'pool' });
            };

            DatabaseConfig.instance = this;
        }
        return DatabaseConfig.instance;
    }

    _normalizeSql(sql) {
        if (typeof sql === 'string') return sql;
        if (sql && typeof sql.text === 'string') return sql.text;
        return '';
    }

    _normalizeParams(sql, params) {
        if (Array.isArray(params)) return params;
        if (sql && Array.isArray(sql.values)) return sql.values;
        return [];
    }

    _detectProcessType(sql) {
        const text = this._normalizeSql(sql).trim().toUpperCase();
        const firstToken = text.split(/\s+/)[0] || 'OUTRO';

        if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(firstToken)) {
            return 'TRANSACAO';
        }
        if (['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'MERGE'].includes(firstToken)) {
            return 'ALTERACAO';
        }
        if (firstToken === 'WITH') {
            if (/\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(text)) return 'ALTERACAO';
            return 'CONSULTA';
        }
        if (['SELECT', 'SHOW', 'EXPLAIN'].includes(firstToken)) {
            return 'CONSULTA';
        }
        return 'OUTRO';
    }

    _buildProcessKey(sql, params, source) {
        const normalizedSql = this._normalizeSql(sql).replace(/\s+/g, ' ').trim();
        const payload = `${source}|${normalizedSql}|${JSON.stringify(params || [])}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    _pushHistory(entry) {
        this._processHistory.unshift(entry);
        if (this._processHistory.length > this._maxHistoryEntries) {
            this._processHistory.length = this._maxHistoryEntries;
        }
    }

    async _executeWithProcess(runner, sql, params, options = {}) {
        const normalizedParams = this._normalizeParams(sql, params);
        const source = options.source || 'db';
        const processType = this._detectProcessType(sql);
        const dedupeAllowed = options.dedupe !== false && (processType === 'CONSULTA' || processType === 'ALTERACAO');
        const processKey = this._buildProcessKey(sql, normalizedParams, source);

        if (dedupeAllowed && this._inFlightProcessMap.has(processKey)) {
            const existing = this._inFlightProcessMap.get(processKey);
            existing.duplicates = (existing.duplicates || 0) + 1;
            return existing.promise;
        }

        const startedAt = Date.now();
        const processInfo = {
            id: processKey,
            source,
            type: processType,
            sql: this._normalizeSql(sql),
            startedAt,
            status: 'EXECUTANDO',
            duplicates: 0,
        };

        const promise = (async () => {
            try {
                const result = await runner(sql, normalizedParams);
                const finishedAt = Date.now();
                processInfo.status = 'CONCLUIDO';
                processInfo.finishedAt = finishedAt;
                processInfo.durationMs = finishedAt - startedAt;
                processInfo.rowCount = typeof result?.rowCount === 'number'
                    ? result.rowCount
                    : (Array.isArray(result?.rows) ? result.rows.length : null);
                this._pushHistory({ ...processInfo });
                return result;
            } catch (error) {
                const finishedAt = Date.now();
                processInfo.status = 'ERRO';
                processInfo.finishedAt = finishedAt;
                processInfo.durationMs = finishedAt - startedAt;
                processInfo.error = error.message;
                this._pushHistory({ ...processInfo });
                throw error;
            } finally {
                this._inFlightProcessMap.delete(processKey);
            }
        })();

        this._inFlightProcessMap.set(processKey, { ...processInfo, promise });
        return promise;
    }

    // Método central para consultas/alterações com deduplicação de processos em execução.
    async query(sql, params, options = {}) {
        try {
            const res = await this._executeWithProcess(this._rawPoolQuery, sql, params, {
                source: options.source || 'db',
                dedupe: options.dedupe,
            });
            return res;
        } catch (error) {
            console.error('ERRO CRÍTICO NO DB:', error.stack, 'SQL:', sql);
            // Lança o erro para ser capturado no index.js ou na camada Repository
            throw new Error(`Falha na comunicação com o banco de dados. Verifique a instância do PostgreSQL. Detalhes: ${error.message}`);
        }
    }

    // Consulta administrativa de processos ativos do PostgreSQL.
    async getDatabaseProcesses() {
        const sql = `
            SELECT
                pid,
                usename,
                state,
                wait_event_type,
                wait_event,
                query_start,
                LEFT(query, 400) AS query
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
            ORDER BY query_start DESC;
        `;
        const { rows } = await this._rawPoolQuery(sql);
        return rows;
    }

    // Detecta possíveis processos duplicados ativos por mesma query no banco.
    async getDuplicateDatabaseProcesses() {
        const sql = `
            SELECT
                LEFT(query, 400) AS query,
                state,
                COUNT(*)::INT AS total,
                MIN(query_start) AS first_started_at,
                MAX(query_start) AS last_started_at
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
              AND state IN ('active', 'idle in transaction')
              AND query NOT ILIKE '%pg_stat_activity%'
            GROUP BY query, state
            HAVING COUNT(*) > 1
            ORDER BY total DESC, first_started_at ASC;
        `;
        const { rows } = await this._rawPoolQuery(sql);
        return rows;
    }

    // Histórico em memória das consultas/alterações executadas pela API.
    getProcessHistory(limit = 50, type = null) {
        const normalizedLimit = Math.max(1, Math.min(Number(limit) || 50, this._maxHistoryEntries));
        const normalizedType = type ? String(type).toUpperCase() : null;
        let history = this._processHistory;
        if (normalizedType) {
            history = history.filter((entry) => entry.type === normalizedType);
        }
        return history.slice(0, normalizedLimit);
    }

    getActiveProcesses() {
        return Array.from(this._inFlightProcessMap.values()).map((p) => ({
            id: p.id,
            source: p.source,
            type: p.type,
            startedAt: p.startedAt,
            status: p.status,
            duplicates: p.duplicates || 0,
            sql: p.sql,
        }));
    }
}
module.exports = new DatabaseConfig();