// server/models/ClienteModel.js
const UsuarioModel = require('./UsuarioModel'); 
class ClienteModel extends UsuarioModel {
    constructor(id, nome, login, senhaHash, cpf, email, telefone) {
        super(id, nome, login, senhaHash, 'CLIENTE', cpf, email, telefone, null, null); 
    }
}
module.exports = ClienteModel;