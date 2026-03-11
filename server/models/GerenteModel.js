// server/models/GerenteModel.js
const FuncionarioModel = require('./FuncionarioModel');

/**
 * Representa o funcionário com permissões gerenciais.
 */
class GerenteModel extends FuncionarioModel {
    constructor(id, nome, login, senhaHash, matricula) {
        // Fixa o tipoPerfil como GERENTE
        super(id, nome, login, senhaHash, matricula, 'GERENTE');
    }
}
module.exports = GerenteModel;

