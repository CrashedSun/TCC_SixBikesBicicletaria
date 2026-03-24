-- ==========================================================
-- 1. TABELA USUARIO (Unificada - Cliente, Funcionario, etc.)
-- RF001, RF010, RNF001, RNF002
-- ==========================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id BIGSERIAL PRIMARY KEY,                   
    nome VARCHAR(100) NOT NULL,                 
    senha_hash VARCHAR(255) NOT NULL,           
    tipo_perfil VARCHAR(20) NOT NULL,           -- (PROPRIETARIO, GERENTE, ATENDENTE, MECANICO, CLIENTE)
    
    cpf VARCHAR(14) UNIQUE,                     
    email VARCHAR(100) UNIQUE NOT NULL,         
    telefone VARCHAR(20),                       

    matricula VARCHAR(20) UNIQUE,               
    ativo BOOLEAN DEFAULT true,
    trocar_senha BOOLEAN DEFAULT false,
    
    CHECK (tipo_perfil IN ('PROPRIETARIO', 'GERENTE', 'ATENDENTE', 'MECANICO', 'CLIENTE'))
);

-- Extensão para hash de senha no seed (evita hash hardcoded no SQL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- 1.1 TABELA DE AUDITORIA GLOBAL
-- Logs do sistema: quem fez o quê, quando, de onde e com qual resultado
-- ==========================================================
CREATE TABLE IF NOT EXISTS auditoria_log (
    id BIGSERIAL PRIMARY KEY,
    criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(64),
    nivel VARCHAR(20) NOT NULL DEFAULT 'INFO',                -- INFO, WARN, ERROR
    acao VARCHAR(120) NOT NULL,                               -- Ex.: AUTH_LOGIN_FAILED, REQUEST_COMPLETED
    recurso VARCHAR(120),                                     -- Ex.: AUTH, PRODUTO, RESERVA
    recurso_id VARCHAR(80),                                   -- ID textual do recurso afetado
    metodo VARCHAR(10),                                       -- GET, POST, PUT, DELETE...
    rota VARCHAR(255),                                        -- Caminho da rota
    status_code INT,
    usuario_id BIGINT,
    usuario_perfil VARCHAR(30),
    usuario_email VARCHAR(150),
    ip VARCHAR(64),
    user_agent TEXT,
    mensagem TEXT,
    detalhes JSONB,

    CONSTRAINT auditoria_log_nivel_chk CHECK (nivel IN ('INFO', 'WARN', 'ERROR')),
    CONSTRAINT auditoria_log_usuario_fk FOREIGN KEY (usuario_id) REFERENCES Usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_log_criado_em ON auditoria_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_usuario_id ON auditoria_log (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_nivel ON auditoria_log (nivel);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_status_code ON auditoria_log (status_code);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_rota ON auditoria_log (rota);


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
    imagem_url TEXT,
    idCategoria INT,                            
    
    FOREIGN KEY (idCategoria) REFERENCES Categoria (idCategoria)
);

CREATE TABLE IF NOT EXISTS Estoque (             
    idEstoque SERIAL PRIMARY KEY,               
    idProduto INT UNIQUE NOT NULL,              
    quantidadeAtual INT NOT NULL DEFAULT 0,

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
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO', -- {ABERTO, EM ANDAMENTO, PARA PAGAMENTO, PAGO, CONCLUIDO, CANCELADO}
    datacriacao TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataAgendada TIMESTAMP WITHOUT TIME ZONE,
    observacoes TEXT,
    metodopagamento VARCHAR(50),
    datapagamento TIMESTAMP,

    FOREIGN KEY (idservico) REFERENCES servicos (idservico),
    FOREIGN KEY (idcliente) REFERENCES Usuario (id),
    FOREIGN KEY (idmecanico) REFERENCES Usuario (id),
    CHECK (status IN ('ABERTO','EM ANDAMENTO','PARA PAGAMENTO','PAGO','CONCLUIDO','CANCELADO'))
);

CREATE TABLE IF NOT EXISTS itemagendamento (
    id BIGSERIAL PRIMARY KEY,
    idagendamento BIGINT NOT NULL,
    idservico INT NOT NULL,
    idproduto INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),

    FOREIGN KEY (idagendamento) REFERENCES agendamento (id) ON DELETE CASCADE,
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
    status VARCHAR(20) NOT NULL,                -- {ATIVA, EXPIRADA, CANCELADA, PAGA}
    statusPagamento VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- {PENDENTE, PAGO, CANCELADO}
    metodoPagamento VARCHAR(20),                -- {PIX, DINHEIRO, CREDITO, DEBITO} 
    idAtendente INT,                            

    FOREIGN KEY (idCliente) REFERENCES Usuario (id),
    FOREIGN KEY (idAtendente) REFERENCES Usuario (id),
    CHECK (status IN ('ATIVA', 'EXPIRADA', 'CANCELADA', 'PAGA')),
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
-- 7. INSERÇÃO DE USUÁRIOS PADRÃO (SEED DINÂMICO)
-- Senha inicial dinâmica: parte local do e-mail (antes do @)
-- Ex.: gerente@sixbikes.com -> senha "gerente"
-- ==========================================================
INSERT INTO Usuario (nome, senha_hash, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
SELECT
    v.nome,
    crypt(lower(split_part(v.email, '@', 1)), gen_salt('bf')),
    v.tipo_perfil,
    v.cpf,
    v.email,
    v.telefone,
    v.matricula,
    v.ativo,
    v.trocar_senha
FROM (
    VALUES
        ('Proprietário Padrão', 'PROPRIETARIO', '111.111.111-11', 'proprietario@sixbikes.com', '(11) 99999-0001', 'FUNC001', true, true),
        ('Gerente Padrão', 'GERENTE', '222.222.222-22', 'gerente@sixbikes.com', '(11) 99999-0002', 'FUNC002', true, true),
        ('Atendente Padrão', 'ATENDENTE', '333.333.333-33', 'atendente@sixbikes.com', '(11) 99999-0003', 'FUNC003', true, true),
        ('Mecânico Padrão', 'MECANICO', '444.444.444-44', 'mecanico@sixbikes.com', '(11) 99999-0004', 'FUNC004', true, true),
        ('Cliente Padrão', 'CLIENTE', '555.555.555-55', 'cliente@email.com', '(11) 98888-0001', NULL, true, false)
) AS v(nome, tipo_perfil, cpf, email, telefone, matricula, ativo, trocar_senha)
WHERE NOT EXISTS (SELECT 1 FROM Usuario u WHERE u.email = v.email);

-- ==========================================================
-- 8. DADOS PADRÃO (DEMONSTRAÇÃO)
-- ==========================================================

-- Categorias
INSERT INTO Categoria (nome)
SELECT 'Bicicletas'
WHERE NOT EXISTS (SELECT 1 FROM Categoria WHERE nome = 'Bicicletas');

INSERT INTO Categoria (nome)
SELECT 'Acessórios'
WHERE NOT EXISTS (SELECT 1 FROM Categoria WHERE nome = 'Acessórios');

INSERT INTO Categoria (nome)
SELECT 'Peças'
WHERE NOT EXISTS (SELECT 1 FROM Categoria WHERE nome = 'Peças');

-- Produtos
INSERT INTO Produto (nome, descricao, preco, imagem_url, idCategoria)
SELECT
        'Bicicleta Urbana 700',
        'Modelo urbano para deslocamentos diários.',
        1899.90,
        '/assets/img/category_img_01.webp',
        c.idCategoria
FROM Categoria c
WHERE c.nome = 'Bicicletas'
    AND NOT EXISTS (SELECT 1 FROM Produto p WHERE p.nome = 'Bicicleta Urbana 700');

INSERT INTO Produto (nome, descricao, preco, imagem_url, idCategoria)
SELECT
        'Capacete Pro Ride',
        'Capacete com ventilação reforçada e ajuste rápido.',
        249.90,
        '/assets/img/category_img_01.webp',
        c.idCategoria
FROM Categoria c
WHERE c.nome = 'Acessórios'
    AND NOT EXISTS (SELECT 1 FROM Produto p WHERE p.nome = 'Capacete Pro Ride');

INSERT INTO Produto (nome, descricao, preco, imagem_url, idCategoria)
SELECT
        'Kit Freio a Disco',
        'Kit de freio a disco hidráulico para MTB.',
        399.90,
        '/assets/img/category_img_01.webp',
        c.idCategoria
FROM Categoria c
WHERE c.nome = 'Peças'
    AND NOT EXISTS (SELECT 1 FROM Produto p WHERE p.nome = 'Kit Freio a Disco');

-- Estoque
INSERT INTO Estoque (idProduto, quantidadeAtual)
SELECT p.idProduto, 8
FROM Produto p
WHERE p.nome = 'Bicicleta Urbana 700'
    AND NOT EXISTS (SELECT 1 FROM Estoque e WHERE e.idProduto = p.idProduto);

INSERT INTO Estoque (idProduto, quantidadeAtual)
SELECT p.idProduto, 25
FROM Produto p
WHERE p.nome = 'Capacete Pro Ride'
    AND NOT EXISTS (SELECT 1 FROM Estoque e WHERE e.idProduto = p.idProduto);

INSERT INTO Estoque (idProduto, quantidadeAtual)
SELECT p.idProduto, 15
FROM Produto p
WHERE p.nome = 'Kit Freio a Disco'
    AND NOT EXISTS (SELECT 1 FROM Estoque e WHERE e.idProduto = p.idProduto);

-- Serviços
INSERT INTO servicos (nome, duracaoestimada, valor, foto)
SELECT 'Revisão Básica', 60, 99.90, '/assets/img/category_img_01.webp'
WHERE NOT EXISTS (SELECT 1 FROM servicos s WHERE s.nome = 'Revisão Básica');

INSERT INTO servicos (nome, duracaoestimada, valor, foto)
SELECT 'Troca de Pneus', 45, 79.90, '/assets/img/category_img_01.webp'
WHERE NOT EXISTS (SELECT 1 FROM servicos s WHERE s.nome = 'Troca de Pneus');

-- Agendamentos
INSERT INTO agendamento (idservico, idcliente, idmecanico, status, dataAgendada, observacoes, metodopagamento, datapagamento)
SELECT
        s.idservico,
        uc.id,
        um.id,
        'ABERTO',
        CURRENT_TIMESTAMP + INTERVAL '1 day',
        'Cliente solicitou revisão preventiva.',
        NULL,
        NULL
FROM servicos s
CROSS JOIN Usuario uc
CROSS JOIN Usuario um
WHERE s.nome = 'Revisão Básica'
    AND uc.email = 'cliente@email.com'
    AND um.email = 'mecanico@sixbikes.com'
    AND NOT EXISTS (
            SELECT 1
            FROM agendamento a
            WHERE a.idservico = s.idservico
                AND a.idcliente = uc.id
                AND a.status = 'ABERTO'
    );

-- Itens do agendamento
INSERT INTO itemagendamento (idagendamento, idservico, idproduto, quantidade)
SELECT
        a.id,
        a.idservico,
        p.idProduto,
        1
FROM agendamento a
JOIN Produto p ON p.nome = 'Kit Freio a Disco'
WHERE a.status = 'ABERTO'
    AND a.observacoes = 'Cliente solicitou revisão preventiva.'
    AND NOT EXISTS (
            SELECT 1
            FROM itemagendamento ia
            WHERE ia.idagendamento = a.id
                AND ia.idproduto = p.idProduto
    );

-- Reservas
INSERT INTO Reserva (idCliente, prazoRetirada, status, statusPagamento, metodoPagamento, idAtendente)
SELECT
        uc.id,
        CURRENT_TIMESTAMP + INTERVAL '2 days',
        'ATIVA',
        'PENDENTE',
        NULL,
        ua.id
FROM Usuario uc
CROSS JOIN Usuario ua
WHERE uc.email = 'cliente@email.com'
    AND ua.email = 'atendente@sixbikes.com'
    AND NOT EXISTS (
            SELECT 1
            FROM Reserva r
            WHERE r.idCliente = uc.id
                AND r.status = 'ATIVA'
                AND r.statusPagamento = 'PENDENTE'
    );

-- Itens da reserva
INSERT INTO ItemReserva (idReserva, idProduto, quantidade, valorUnitario)
SELECT
        r.idReserva,
        p.idProduto,
        1,
        p.preco
FROM Reserva r
JOIN Usuario uc ON uc.id = r.idCliente
JOIN Produto p ON p.nome = 'Capacete Pro Ride'
WHERE uc.email = 'cliente@email.com'
    AND r.status = 'ATIVA'
    AND r.statusPagamento = 'PENDENTE'
    AND NOT EXISTS (
            SELECT 1
            FROM ItemReserva ir
            WHERE ir.idReserva = r.idReserva
                AND ir.idProduto = p.idProduto
    );

-- Tickets
INSERT INTO Ticket (idCliente, idFuncionarioResposta, mensagem, nome, email, titulo, resposta, status)
SELECT
        uc.id,
        ua.id,
        'Gostaria de saber prazo para revisão completa.',
        uc.nome,
        uc.email,
        'Dúvida sobre revisão',
        NULL,
        'ABERTO'
FROM Usuario uc
CROSS JOIN Usuario ua
WHERE uc.email = 'cliente@email.com'
    AND ua.email = 'atendente@sixbikes.com'
    AND NOT EXISTS (
            SELECT 1
            FROM Ticket t
            WHERE t.titulo = 'Dúvida sobre revisão'
                AND t.idCliente = uc.id
    );

-- Eventos
INSERT INTO Evento (nome, data, vagasTotal, vagasDisponiveis)
SELECT 'Pedal da Cidade', CURRENT_DATE + 15, 30, 29
WHERE NOT EXISTS (SELECT 1 FROM Evento e WHERE e.nome = 'Pedal da Cidade');

INSERT INTO Evento (nome, data, vagasTotal, vagasDisponiveis)
SELECT 'Workshop de Mecânica', CURRENT_DATE + 20, 20, 19
WHERE NOT EXISTS (SELECT 1 FROM Evento e WHERE e.nome = 'Workshop de Mecânica');

-- Inscrições em eventos
INSERT INTO InscricaoEvento (idEvento, idCliente)
SELECT e.idEvento, uc.id
FROM Evento e
JOIN Usuario uc ON uc.email = 'cliente@email.com'
WHERE e.nome = 'Pedal da Cidade'
    AND NOT EXISTS (
            SELECT 1
            FROM InscricaoEvento ie
            WHERE ie.idEvento = e.idEvento
                AND ie.idCliente = uc.id
    );

-- ============================================================
-- CREDENCIAIS PADRÃO
-- ============================================================
-- | E-mail                    | Senha  | Perfil        |
-- |---------------------------|--------|---------------|
-- | proprietario@sixbikes.com | 123456 | PROPRIETARIO  |
-- | gerente@sixbikes.com      | 123456 | GERENTE       |
-- | atendente@sixbikes.com    | 123456 | ATENDENTE     |
-- | mecanico@sixbikes.com     | 123456 | MECANICO      |
-- | cliente@email.com         | 123456 | CLIENTE       |
-- ============================================================
