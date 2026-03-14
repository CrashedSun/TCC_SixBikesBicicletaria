-- ==========================================================
-- 1. TABELA USUARIO (Unificada - Cliente, Funcionario, etc.)
-- RF001, RF010, RNF001, RNF002
-- ==========================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id BIGSERIAL PRIMARY KEY,                   
    nome VARCHAR(100) NOT NULL,                 
    login VARCHAR(100) UNIQUE NOT NULL,         
    senha_hash VARCHAR(255) NOT NULL,           
    tipo_perfil VARCHAR(20) NOT NULL,           -- (PROPRIETARIO, GERENTE, ATENDENTE, MECANICO, CLIENTE)
    
    cpf VARCHAR(14) UNIQUE,                     
    email VARCHAR(100),                         
    telefone VARCHAR(20),                       

    matricula VARCHAR(20) UNIQUE,               
    ativo BOOLEAN DEFAULT true;
    trocar_senha BOOLEAN DEFAULT false;
    
    CHECK (tipo_perfil IN ('PROPRIETARIO', 'GERENTE', 'ATENDENTE', 'MECANICO', 'CLIENTE'))
);


-- ==========================================================
-- 2. TABELAS DE PRODUTOS E ESTOQUE
-- ==========================================================
CREATE TABLE IF NOT EXISTS Categoria (
    idCategoria SERIAL PRIMARY KEY,            
    nome VARCHAR(50) UNIQUE NOT NULL           
);

CREATE TABLE IF NOT EXISTS Produto (
    idProduto SERIAL PRIMARY KEY,               
    nome VARCHAR(150) NOT NULL,                 
    descricao TEXT,                             
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00, 
    idCategoria INT,                            
    
    FOREIGN KEY (idCategoria) REFERENCES Categoria (idCategoria)
);

CREATE TABLE IF NOT EXISTS Estoque (             
    idEstoque SERIAL PRIMARY KEY,               
    idProduto INT UNIQUE NOT NULL,              
    quantidadeAtual INT NOT NULL DEFAULT 0,     
    imagem_url TEXT,

    FOREIGN KEY (idProduto) REFERENCES Produto (idProduto)
);

CREATE TABLE IF NOT EXISTS servicos (
    idservico SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    duracaoestimada INT NOT NULL DEFAULT 0,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    foto TEXT
);

CREATE TABLE IF NOT EXISTS agendamento (
    id BIGSERIAL PRIMARY KEY,
    idservico INT NOT NULL,
    idcliente BIGINT NOT NULL,
    idmecanico BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO', -- {ABERTO, EM ANDAMENTO, PARA PAGAMENTO, CONCLUIDO}
    datacriacao TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataAgendada TIMESTAMP WITHOUT TIME ZONE,
    observacoes TEXT,
    metodopagamento VARCHAR(50),
    datapagamento TIMESTAMP,

    FOREIGN KEY (idservico) REFERENCES servicos (idservico),
    FOREIGN KEY (idcliente) REFERENCES Usuario (id),
    FOREIGN KEY (idmecanico) REFERENCES Usuario (id),
    CHECK (status IN ('ABERTO','EM ANDAMENTO','PARA PAGAMENTO','CONCLUIDO'))
);

CREATE TABLE IF NOT EXISTS itemagendamento (
    id BIGSERIAL PRIMARY KEY,
    idservico INT NOT NULL,
    idproduto INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),

    FOREIGN KEY (idservico) REFERENCES servicos (idservico) ON DELETE CASCADE,
    FOREIGN KEY (idproduto) REFERENCES Produto (idProduto)
);


-- ==========================================================
-- 5. TABELAS DE RESERVAS E TICKETS
-- ==========================================================
CREATE TABLE IF NOT EXISTS Reserva (
    idReserva BIGSERIAL PRIMARY KEY,
    idCliente INT NOT NULL,
    dataReserva TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    prazoRetirada TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) NOT NULL,                -- {ATIVA, EXPIRADA, CANCELADA}
    statusPagamento VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- {PENDENTE, PAGO, CANCELADO}
    metodoPagamento VARCHAR(20),                -- {PIX, DINHEIRO, CREDITO, DEBITO} 
    idAtendente INT,                            

    FOREIGN KEY (idCliente) REFERENCES Usuario (id),
    FOREIGN KEY (idAtendente) REFERENCES Usuario (id),
    CHECK (status IN ('ATIVA', 'EXPIRADA', 'CANCELADA')),
    CHECK (statusPagamento IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    CHECK (metodoPagamento IS NULL OR metodoPagamento IN ('PIX','DINHEIRO','CREDITO','DEBITO'))
);

CREATE TABLE IF NOT EXISTS ItemReserva (
    idItemReserva BIGSERIAL PRIMARY KEY,
    idReserva BIGINT NOT NULL,
    idProduto INT NOT NULL,
    quantidade INT NOT NULL,
    valorUnitario NUMERIC(10,2) NOT NULL,

    FOREIGN KEY (idReserva) REFERENCES Reserva (idReserva) ON DELETE CASCADE,
    FOREIGN KEY (idProduto) REFERENCES Produto (idProduto)
);

CREATE TABLE IF NOT EXISTS Ticket (             
    idTicket BIGSERIAL PRIMARY KEY,             
    idCliente INT,                              
    idFuncionarioResposta INT,                  
    mensagem TEXT NOT NULL,                     
    nome VARCHAR(100),                          
    email VARCHAR(100),                         
    titulo VARCHAR(150),                        
    resposta TEXT,                              
    status VARCHAR(20) NOT NULL,                -- {ABERTO, EM ATENDIMENTO, FECHADO}
    dataAbertura TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 

    FOREIGN KEY (idCliente) REFERENCES Usuario (id),
    FOREIGN KEY (idFuncionarioResposta) REFERENCES Usuario (id),
    CHECK (status IN ('ABERTO', 'EM ATENDIMENTO', 'FECHADO'))
);

-- ==========================================================
-- 6. TABELAS DE EVENTOS
-- ==========================================================
CREATE TABLE IF NOT EXISTS Evento (
    idEvento SERIAL PRIMARY KEY,                
    nome VARCHAR(150) NOT NULL,                 
    data DATE NOT NULL,                         
    vagasTotal INT NOT NULL,                    
    vagasDisponiveis INT NOT NULL              
);

CREATE TABLE IF NOT EXISTS InscricaoEvento (
    idInscricao SERIAL PRIMARY KEY,             
    idEvento INT NOT NULL,                      
    idCliente INT NOT NULL,                     
    dataInscricao DATE NOT NULL DEFAULT CURRENT_DATE, 

    FOREIGN KEY (idEvento) REFERENCES Evento (idEvento),
    FOREIGN KEY (idCliente) REFERENCES Usuario (id),
    UNIQUE (idEvento, idCliente)
);

-- ==========================================================
-- 7. iNSERÇÃO DE USUÁRIOS PADRÃO
-- ==========================================================

INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
VALUES (
    'Proprietário Padrão',
    'proprietario',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'PROPRIETARIO',
    '111.111.111-11',
    'proprietario@sixbikes.com',
    '(11) 99999-0001',
    'FUNC001',
    true,
    true
);

INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
VALUES (
    'Gerente Padrão',
    'gerente',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'GERENTE',
    '222.222.222-22',
    'gerente@sixbikes.com',
    '(11) 99999-0002',
    'FUNC002',
    true,
    true
);

INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
VALUES (
    'Atendente Padrão',
    'atendente',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'ATENDENTE',
    '333.333.333-33',
    'atendente@sixbikes.com',
    '(11) 99999-0003',
    'FUNC003',
    true,
    true
);

INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
VALUES (
    'Mecânico Padrão',
    'mecanico',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'MECANICO',
    '444.444.444-44',
    'mecanico@sixbikes.com',
    '(11) 99999-0004',
    'FUNC004',
    true,
    true
);

INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
VALUES (
    'Cliente Padrão',
    'cliente@email.com',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'CLIENTE',
    '555.555.555-55',
    'cliente@email.com',
    '(11) 98888-0001',
    NULL,
    true,
    false
);

-- ============================================================
-- CREDENCIAIS PADRÃO
-- ============================================================
-- | Login          | Senha  | Perfil        |
-- |----------------|--------|---------------|
-- | proprietario   | 123456 | PROPRIETARIO  |
-- | gerente        | 123456 | GERENTE       |
-- | atendente      | 123456 | ATENDENTE     |
-- | mecanico       | 123456 | MECANICO      |
-- | maria@email.com| 123456 | CLIENTE       |
-- ============================================================
