-- Adiciona colunas de pagamento na tabela agendamento
ALTER TABLE agendamento 
ADD COLUMN IF NOT EXISTS metodopagamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS datapagamento TIMESTAMP;
