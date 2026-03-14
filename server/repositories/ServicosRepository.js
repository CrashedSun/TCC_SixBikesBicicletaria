const db = require('../config/database');

module.exports = {
  async listarTodos() {
    const { rows } = await db.query('SELECT idservico, nome, duracaoestimada, valor, foto FROM servicos ORDER BY idservico DESC');
    return rows;
  },
  async listarMaisVendidos(limit = 3) {
    const { rows } = await db.query(
      `SELECT s.idservico, s.nome, s.duracaoestimada, s.valor, s.foto,
              COALESCE(popularidade.totalvendido, 0) AS "totalVendido"
         FROM servicos s
         LEFT JOIN (
              SELECT a.idservico, COUNT(*) AS totalvendido
                FROM agendamento a
               WHERE a.status IN ('EM ANDAMENTO', 'PARA PAGAMENTO', 'PAGO', 'CONCLUIDO')
            GROUP BY a.idservico
         ) popularidade ON popularidade.idservico = s.idservico
     ORDER BY COALESCE(popularidade.totalvendido, 0) DESC, s.nome ASC
        LIMIT $1`,
      [limit]
    );
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
