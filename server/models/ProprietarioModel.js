// server/models/ProprietarioModel.js
const FuncionarioModel = require('./FuncionarioModel');

/**
 * Representa o Proprietário, com permissões máximas.
 */
class ProprietarioModel extends FuncionarioModel {
    constructor(id, nome, login, senhaHash, matricula) {
        // Fixa o tipoPerfil como PROPRIETARIO
        super(id, nome, login, senhaHash, matricula, 'PROPRIETARIO');
    }
}
module.exports = ProprietarioModel;