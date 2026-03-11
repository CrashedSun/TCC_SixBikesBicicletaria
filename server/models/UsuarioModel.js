// server/models/UsuarioModel.js
/**
 * Superclasse que representa qualquer usuário do sistema (Cliente, Funcionário, Gerente, etc.).
 * Os atributos cpf, email, telefone e matricula são opcionais e dependem do tipoPerfil.
 */
class UsuarioModel {
    /**
     * @param {string} tipoPerfil - Deve ser um valor do domínio: {“CLIENTE”, “ATENDENTE”, “MECANICO”, “GERENTE”, “PROPRIETARIO”}[cite: 717].
     */
    constructor(id, nome, login, senhaHash, tipoPerfil, cpf, email, telefone, matricula, ativo = true, trocarSenha = false) {
        this.id = id;
        this.nome = nome;
        this.login = login;
        this.senhaHash = senhaHash;
        this.tipoPerfil = tipoPerfil ? tipoPerfil.toUpperCase() : 'CLIENTE'; 
        
        // Atributos do Cliente
        this.cpf = cpf;
        this.email = email;
        this.telefone = telefone;
        
        // Atributos do Funcionário
        this.matricula = matricula; // Identificador interno [cite: 741]
        this.ativo = ativo === undefined ? true : ativo;
        this.trocarSenha = trocarSenha === undefined ? false : trocarSenha;
    }

    isFuncionario() {
        return ['PROPRIETARIO', 'GERENTE', 'MECANICO', 'ATENDENTE'].includes(this.tipoPerfil);
    }
}
module.exports = UsuarioModel;