// server/repositories/InscricaoEventoRepository.js
const db = require('../config/database');

class InscricaoEventoRepository {
  async verificarExiste(idEvento, idCliente) {
    const sql = 'SELECT idinscricao FROM inscricaoevento WHERE idevento = $1 AND idcliente = $2';
    const { rows } = await db.query(sql, [idEvento, idCliente]);
    return rows.length > 0;
  }

  async inscrever(idEvento, idCliente) {
    // Transação simples para garantir decremento consistente de vagas
    try {
      await db.query('BEGIN');
      // Bloqueia linha do evento
      const evRes = await db.query('SELECT idevento, vagasdisponiveis, data FROM evento WHERE idevento = $1 FOR UPDATE', [idEvento]);
      if (evRes.rows.length === 0) throw new Error('Evento não encontrado.');
      const evento = evRes.rows[0];
      const hoje = new Date().toISOString().split('T')[0];
      if (evento.data < hoje) throw new Error('Evento já ocorreu.');
      if (Number(evento.vagasdisponiveis) <= 0) throw new Error('Evento lotado.');

      const jaExiste = await this.verificarExiste(idEvento, idCliente);
      if (jaExiste) throw new Error('Você já está inscrito neste evento.');

      await db.query('INSERT INTO inscricaoevento (idevento, idcliente) VALUES ($1, $2)', [idEvento, idCliente]);
      await db.query('UPDATE evento SET vagasdisponiveis = vagasdisponiveis - 1 WHERE idevento = $1', [idEvento]);
      await db.query('COMMIT');
      return { message: 'Inscrição realizada com sucesso.' };
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  }

  async listarPorEvento(idEvento) {
    const sql = `SELECT ie.idinscricao, ie.datainscricao, u.id, u.nome, u.login as email
                 FROM inscricaoevento ie
                 JOIN usuario u ON ie.idcliente = u.id
                 WHERE ie.idevento = $1
                 ORDER BY ie.datainscricao DESC`;
    const { rows } = await db.query(sql, [idEvento]);
    return rows;
  }
}

module.exports = new InscricaoEventoRepository();