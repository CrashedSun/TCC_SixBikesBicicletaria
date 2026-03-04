-- ============================================================
-- SCRIPT DE INSERÇÃO DE USUÁRIOS PADRÃO - SIX BIKES
-- Execute APÓS o script criaçãodb.sql
-- ============================================================

-- ============================================================
-- FIX: Adiciona coluna 'cargo' que o código da aplicação espera
-- mas que não está no DDL original.
-- ============================================================
ALTER TABLE Usuario ADD COLUMN IF NOT EXISTS cargo VARCHAR(50);

-- ============================================================
-- SENHA PADRÃO PARA TODOS OS USUÁRIOS: 123456
-- Hash bcrypt (10 rounds): $2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42
--
-- Funcionários têm trocar_senha = true (forçar troca no 1º login)
-- Cliente tem trocar_senha = false (senha já definida pelo próprio)
-- ============================================================

-- 1. PROPRIETÁRIO (Dono da loja / Acesso total)
INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, cargo, ativo, trocar_senha)
VALUES (
    'Proprietário Padrão',
    'proprietario',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'PROPRIETARIO',
    '111.111.111-11',
    'proprietario@sixbikes.com',
    '(11) 99999-0001',
    'FUNC001',
    'Proprietário',
    true,
    true
);

-- 2. GERENTE
INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, cargo, ativo, trocar_senha)
VALUES (
    'Gerente Padrão',
    'gerente',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'GERENTE',
    '222.222.222-22',
    'gerente@sixbikes.com',
    '(11) 99999-0002',
    'FUNC002',
    'Gerente',
    true,
    true
);

-- 3. ATENDENTE
INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, cargo, ativo, trocar_senha)
VALUES (
    'Atendente Padrão',
    'atendente',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'ATENDENTE',
    '333.333.333-33',
    'atendente@sixbikes.com',
    '(11) 99999-0003',
    'FUNC003',
    'Atendente',
    true,
    true
);

-- 4. MECÂNICO
INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, cargo, ativo, trocar_senha)
VALUES (
    'Mecânico Padrão',
    'mecanico',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'MECANICO',
    '444.444.444-44',
    'mecanico@sixbikes.com',
    '(11) 99999-0004',
    'FUNC004',
    'Mecânico',
    true,
    true
);

-- 5. CLIENTE (registro normal, sem trocar_senha)
INSERT INTO Usuario (nome, login, senha_hash, tipo_perfil, cpf, email, telefone, matricula, cargo, ativo, trocar_senha)
VALUES (
    'Cliente Padrão',
    'cliente@email.com',
    '$2b$10$tagOeLgVNqSq0D72U5B/UeRKBr6YSv7JqHNfGvAbq2I7//eijui42',
    'CLIENTE',
    '555.555.555-55',
    'cliente@email.com',
    '(11) 98888-0001',
    NULL,
    NULL,
    true,
    false
);

-- ============================================================
-- RESUMO DE CREDENCIAIS PADRÃO
-- ============================================================
-- | Login          | Senha  | Perfil        | Trocar Senha? |
-- |----------------|--------|---------------|---------------|
-- | proprietario   | 123456 | PROPRIETARIO  | Sim           |
-- | gerente        | 123456 | GERENTE       | Sim           |
-- | atendente      | 123456 | ATENDENTE     | Sim           |
-- | mecanico       | 123456 | MECANICO      | Sim           |
-- | maria@email.com| 123456 | CLIENTE       | Não           |
-- ============================================================
