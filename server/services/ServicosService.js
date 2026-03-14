const repo = require('../repositories/ServicosRepository');

module.exports = {
  async listar() {
    return await repo.listarTodos();
  },
  async listarMaisVendidos(limit = 3) {
    return await repo.listarMaisVendidos(parseInt(limit, 10) || 3);
  },
  async obter(id) {
    if (!id) throw new Error('ID obrigatório');
    const s = await repo.buscarPorId(id);
    if (!s) throw new Error('Serviço não encontrado');
    return s;
  },
  async criar({ nome, duracaoestimada, valor, fotoBase64 }) {
    if (!nome || !nome.trim()) throw new Error('Nome é obrigatório');
    const dur = parseInt(duracaoestimada, 10);
    if (isNaN(dur) || dur <= 0) throw new Error('Duração estimada deve ser > 0');
    const val = parseFloat(valor);
    if (isNaN(val) || val < 0) throw new Error('Valor deve ser >= 0');
    return await repo.criar({ nome: nome.trim(), duracaoestimada: dur, valor: val, foto: fotoBase64 || null });
  },
  async atualizar(id, { nome, duracaoestimada, valor, fotoBase64 }) {
    const dur = parseInt(duracaoestimada, 10);
    if (!nome || !nome.trim()) throw new Error('Nome é obrigatório');
    if (isNaN(dur) || dur <= 0) throw new Error('Duração estimada inválida');
    const val = parseFloat(valor);
    if (isNaN(val) || val < 0) throw new Error('Valor deve ser >= 0');
    const atualizado = await repo.atualizar(id, { nome: nome.trim(), duracaoestimada: dur, valor: val, foto: fotoBase64 || null });
    if (!atualizado) throw new Error('Serviço não encontrado para atualizar');
    return atualizado;
  },
  async deletar(id) {
    const exist = await repo.buscarPorId(id);
    if (!exist) throw new Error('Serviço não encontrado');
    await repo.deletar(id);
    return true;
  }
};
