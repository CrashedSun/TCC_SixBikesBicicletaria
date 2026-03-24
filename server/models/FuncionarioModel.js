// server/models/FuncionarioModel.js
const UsuarioModel = require('./UsuarioModel'); 

/**
 * Classe que representa os colaboradores (Atendentes, Mecânicos, Gerentes, Proprietários).
 * Herda as credenciais de Usuario e define a matricula e o tipoPerfil.
 */
class FuncionarioModel extends UsuarioModel {
    /**
     * @param {string} tipoPerfil - Deve ser um perfil de funcionário: 'ATENDENTE', 'MECANICO', 'GERENTE', ou 'PROPRIETARIO'.
     */
    constructor(id, nome, email, senhaHash, matricula, tipoPerfil) {
        // Chamada ao construtor da superclasse, passando o tipoPerfil
        super(id, nome, email, senhaHash, tipoPerfil, null, null, matricula);
        
        // Atributos específicos do funcionário, mapeados da tabela Usuario (DDL)
    }
}
module.exports = FuncionarioModel;