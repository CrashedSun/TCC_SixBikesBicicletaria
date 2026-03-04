-- DDL SCRIPT PARA O SISTEMA DE GESTÃO DA BICICLETARIA SIX BIKES (POSTGRESQL)
-- Baseado no Modelo Estrutural (Diagrama de Classes) e Requisitos (RFs).

-- ==========================================================
-- 1. TABELA USUARIO (Unificada - Cliente, Funcionario, etc.)
-- RF001, RF010, RNF001, RNF002
-- ==========================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id BIGSERIAL PRIMARY KEY,                   -- idUsuario
    nome VARCHAR(100) NOT NULL,                 -- nome
    login VARCHAR(100) UNIQUE NOT NULL,         -- login (RF001, RF013)
    senha_hash VARCHAR(255) NOT NULL,           -- senha (hash)
    tipo_perfil VARCHAR(20) NOT NULL,           -- tipo (DOMÍNIO: PROPRIETARIO, GERENTE, ATENDENTE, MECANICO, CLIENTE)
    
    -- Campos de Cliente (Opcionais para Funcionário)
    cpf VARCHAR(14) UNIQUE,                     
    email VARCHAR(100),                         
    telefone VARCHAR(20),                       

    -- Campos de Funcionário (Opcionais para Cliente)
    matricula VARCHAR(20) UNIQUE,               -- Identificador interno (RF010)
    ativo BOOLEAN DEFAULT true;
    trocar_senha BOOLEAN DEFAULT false;
    
    -- Domínio de Integridade para o Perfil (RNF002)
    CHECK (tipo_perfil IN ('PROPRIETARIO', 'GERENTE', 'ATENDENTE', 'MECANICO', 'CLIENTE'))
);


-- ==========================================================
-- 2. TABELAS DE PRODUTOS E ESTOQUE (UC002, UC003)
-- ==========================================================
CREATE TABLE IF NOT EXISTS Categoria (
    idCategoria SERIAL PRIMARY KEY,             -- idCategoria
    nome VARCHAR(50) UNIQUE NOT NULL            -- nome
);

CREATE TABLE IF NOT EXISTS Produto (
    idProduto SERIAL PRIMARY KEY,               -- idProduto
    nome VARCHAR(150) NOT NULL,                 -- nome
    descricao TEXT,                             
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- preco
    idCategoria INT,                            
    
    FOREIGN KEY (idCategoria) REFERENCES Categoria (idCategoria)
);

CREATE TABLE IF NOT EXISTS Estoque (             -- Classe Estoque (RF004)
    idEstoque SERIAL PRIMARY KEY,               
    idProduto INT UNIQUE NOT NULL,              -- 1:1 com Produto
    quantidadeAtual INT NOT NULL DEFAULT 0,     -- quantidadeDisponivel (UC003)
    
    FOREIGN KEY (idProduto) REFERENCES Produto (idProduto)
);

-- 3. NOVAS TABELAS DE SERVIÇOS (reinício da modelagem)
-- Catálogo de serviços disponíveis
CREATE TABLE IF NOT EXISTS servicos (
    idservico SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    duracaoestimada INT NOT NULL DEFAULT 0,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    foto TEXT
);

-- Agendamentos de serviços (instâncias solicitadas / execução)
CREATE TABLE IF NOT EXISTS agendamento (
    id BIGSERIAL PRIMARY KEY,
    idservico INT NOT NULL,
    idcliente BIGINT NOT NULL,
    idmecanico BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO', -- {ABERTO, EM ANDAMENTO, PARA PAGAMENTO, CONCLUIDO}
    datacriacao TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataAgendada TIMESTAMP WITHOUT TIME ZONE,
    observacoes TEXT,

    FOREIGN KEY (idservico) REFERENCES servicos (idservico),
    FOREIGN KEY (idcliente) REFERENCES Usuario (id),
    FOREIGN KEY (idmecanico) REFERENCES Usuario (id),
    CHECK (status IN ('ABERTO','EM ANDAMENTO','PARA PAGAMENTO','CONCLUIDO'))
);

-- Itens (produtos/peças) vinculados aos serviços (consumo)
CREATE TABLE IF NOT EXISTS itemagendamento (
    id BIGSERIAL PRIMARY KEY,
    idservico INT NOT NULL,
    idproduto INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),

    FOREIGN KEY (idservico) REFERENCES servicos (idservico) ON DELETE CASCADE,
    FOREIGN KEY (idproduto) REFERENCES Produto (idProduto)
);


-- ==========================================================
-- 5. TABELAS DE RESERVAS E TICKETS (UC007, Suporte)
-- ==========================================================
-- Fluxo atualizado de Reservas: múltiplos itens e pagamento no balcão
CREATE TABLE IF NOT EXISTS Reserva (
    idReserva BIGSERIAL PRIMARY KEY,
    idCliente INT NOT NULL,
    dataReserva TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,                -- {ATIVA, EXPIRADA, CANCELADA}
    statusPagamento VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- {PENDENTE, PAGO, CANCELADO}
    metodoPagamento VARCHAR(20),                -- {PIX, DINHEIRO, CREDITO, DEBITO} (definido no balcão)
    idAtendente INT,                            -- preenchido quando marcar como PAGO

    FOREIGN KEY (idCliente) REFERENCES Usuario (id),
    FOREIGN KEY (idAtendente) REFERENCES Usuario (id),
    CHECK (status IN ('ATIVA', 'EXPIRADA', 'CANCELADA')),
    CHECK (statusPagamento IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    CHECK (metodoPagamento IS NULL OR metodoPagamento IN ('PIX','DINHEIRO','CREDITO','DEBITO'))
);

-- Itens da reserva (múltiplos produtos vinculados à Reserva)
CREATE TABLE IF NOT EXISTS ItemReserva (
    idItemReserva BIGSERIAL PRIMARY KEY,
    idReserva BIGINT NOT NULL,
    idProduto INT NOT NULL,
    quantidade INT NOT NULL,
    valorUnitario NUMERIC(10,2) NOT NULL,

    FOREIGN KEY (idReserva) REFERENCES Reserva (idReserva) ON DELETE CASCADE,
    FOREIGN KEY (idProduto) REFERENCES Produto (idProduto)
);

CREATE TABLE IF NOT EXISTS Ticket (              -- Classe Ticket (Suporte)
    idTicket BIGSERIAL PRIMARY KEY,             
    idCliente INT,                              
    idFuncionarioResposta INT,                  
    mensagem TEXT NOT NULL,                     
    -- Campos adicionais para origem pública do contato
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
-- 6. TABELAS DE EVENTOS (UC008)
-- ==========================================================
CREATE TABLE IF NOT EXISTS Evento (
    idEvento SERIAL PRIMARY KEY,                
    nome VARCHAR(150) NOT NULL,                 
    data DATE NOT NULL,                         
    vagasTotal INT NOT NULL,                    
    vagasDisponiveis INT NOT NULL               -- Controlado pelo sistema (RF011)
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
-- 7. EVOLUÇÃO DE ESQUEMA: RELACIONAR IMAGEM AO PRODUTO
-- Adiciona coluna opcional para armazenar o caminho/URL da imagem do produto
-- (as imagens são salvas em public/assets/img e referenciadas aqui)
-- ==========================================================
ALTER TABLE Produto
    ADD COLUMN IF NOT EXISTS imagem_url TEXT;