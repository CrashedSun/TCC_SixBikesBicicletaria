// server/models/ClienteModel.js
const UsuarioModel = require('./UsuarioModel'); 
class ClienteModel extends UsuarioModel {
    constructor(id, nome, email, senhaHash, cpf, telefone) {
        super(id, nome, email, senhaHash, 'CLIENTE', cpf, telefone, null, null); 
    }
}
module.exports = ClienteModel;