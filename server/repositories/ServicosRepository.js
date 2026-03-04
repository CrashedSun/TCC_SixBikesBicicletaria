const db = require('../config/database');

module.exports = {
  async listarTodos() {
    const { rows } = await db.query('SELECT idservico, nome, duracaoestimada, valor, foto FROM servicos ORDER BY idservico DESC');
    return rows;
  },
  async buscarPorId(id) {
    const { rows } = await db.query('SELECT idservico, nome, duracaoestimada, valor, foto FROM servicos WHERE idservico = $1', [id]);
    return rows[0] || null;
  },
  async criar({ nome, duracaoestimada, valor, foto }) {
    const { rows } = await db.query(
      'INSERT INTO servicos (nome, duracaoestimada, valor, foto) VALUES ($1, $2, $3, $4) RETURNING idservico, nome, duracaoestimada, valor, foto',
      [nome, duracaoestimada, valor, foto || null]
    );
    return rows[0];
  },
  async atualizar(id, { nome, duracaoestimada, valor, foto }) {
    const { rows } = await db.query(
      'UPDATE servicos SET nome = $2, duracaoestimada = $3, valor = $4, foto = $5 WHERE idservico = $1 RETURNING idservico, nome, duracaoestimada, valor, foto',
      [id, nome, duracaoestimada, valor, foto || null]
    );
    return rows[0] || null;
  },
  async deletar(id) {
    await db.query('DELETE FROM servicos WHERE idservico = $1', [id]);
    return true;
  }
};
