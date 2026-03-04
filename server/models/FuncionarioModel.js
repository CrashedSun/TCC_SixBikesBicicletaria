// server/models/FuncionarioModel.js
const UsuarioModel = require('./UsuarioModel'); 

/**
 * Classe que representa os colaboradores (Atendentes, Mecânicos, Gerentes, Proprietários).
 * Herda as credenciais de Usuario e define a matricula e o cargo (tipoPerfil).
 */
class FuncionarioModel extends UsuarioModel {
    /**
     * @param {string} cargo - Deve ser um perfil de funcionário: 'ATENDENTE', 'MECANICO', 'GERENTE', ou 'PROPRIETARIO'.
     */
    constructor(id, nome, login, senhaHash, matricula, cargo) {
        // Chamada ao construtor da superclasse, passando o cargo como tipoPerfil
        super(id, nome, login, senhaHash, cargo, null, null, null, matricula, cargo);
        
        // Atributos específicos do funcionário, mapeados da tabela Usuario (DDL)
    }
}
module.exports = FuncionarioModel;