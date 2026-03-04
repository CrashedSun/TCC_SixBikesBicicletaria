// server/repositories/EventoRepository.js
const db = require('../config/database');

class EventoRepository {
  async criar({ nome, data, vagasTotal }) {
    const sql = `INSERT INTO evento (nome, data, vagastotal, vagasdisponiveis)
                 VALUES ($1, $2, $3, $3)
                 RETURNING idevento, nome, data, vagastotal, vagasdisponiveis`;
    const params = [nome, data, Number(vagasTotal)];
    const { rows } = await db.query(sql, params);
    return rows[0];
  }

  async listarTodos() {
    const sql = `SELECT idevento, nome, data, vagastotal, vagasdisponiveis
                 FROM evento
                 ORDER BY data DESC, idevento DESC`;
    const { rows } = await db.query(sql);
    return rows;
  }
}

module.exports = new EventoRepository();