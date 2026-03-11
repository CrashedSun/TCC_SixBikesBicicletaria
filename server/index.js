// server/index.js
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') }); 

const db = require('./config/database'); 
const authMiddleware = require('./middleware/authMiddleware');

// Importar TODOS os Controllers necessários para todas as rotas
const authController = require('./controllers/AuthController');
const clienteController = require('./controllers/ClienteController'); 
const funcionarioController = require('./controllers/FuncionarioController'); 
const produtoController = require('./controllers/ProdutoController'); 
const agendamentoController = require('./controllers/AgendamentoController'); 
const vendaController = require('./controllers/VendaController'); 
const ticketController = require('./controllers/TicketController'); 
const relatorioController = require('./controllers/RelatorioController'); 
const reservaController = require('./controllers/ReservaController');
const servicosController = require('./controllers/ServicosController');
const eventoController = require('./controllers/EventoController');

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

app.use(cors()); 
// Aumenta o limite de JSON para permitir imagens em base64 no cadastro de produto
app.use(express.json({ limit: '10mb' })); 

// --- ROTAS ABERTAS (Acesso Público) ---
app.post('/api/login', authController.handleLogin); // UC001
app.post('/api/clientes/registro', clienteController.handleRegistro); // RF013
// Tickets: criação exige usuário logado (apenas CLIENTE)
app.post('/api/tickets', authMiddleware(['CLIENTE']), ticketController.handleNewTicket);
// Catálogo público de produtos (acesso sem autenticação)
app.get('/api/produtos/public', produtoController.listarTodos);

// --- ROTAS RESTRITAS (Usam authMiddleware) ---
const ALL_EMPLOYEES = ['ATENDENTE', 'MECANICO', 'GERENTE', 'PROPRIETARIO'];
const ADMIN_ROLES = ['GERENTE', 'PROPRIETARIO'];
const OWNER_ROLES = ['PROPRIETARIO'];
const ANY_USER = ['CLIENTE', 'ATENDENTE', 'MECANICO', 'GERENTE', 'PROPRIETARIO'];

// ** 1. Produtos e Estoque (UC002, UC003) **
app.get('/api/produtos', authMiddleware(['CLIENTE', ...ALL_EMPLOYEES]), produtoController.listarTodos); 
// Rota de categorias DEVE vir antes de /:id para não capturar "categorias" como ID
app.get('/api/produtos/categorias', authMiddleware(ALL_EMPLOYEES), produtoController.listarCategorias);
app.post('/api/produtos/categorias', authMiddleware(ADMIN_ROLES), produtoController.criarCategoria);
app.post('/api/produtos', authMiddleware(ADMIN_ROLES), produtoController.cadastrar); 
app.get('/api/produtos/:id', authMiddleware(['CLIENTE', ...ALL_EMPLOYEES]), produtoController.buscarPorId);
app.put('/api/produtos/:id', authMiddleware(ADMIN_ROLES), produtoController.atualizar); 
app.delete('/api/produtos/:id', authMiddleware(ADMIN_ROLES), produtoController.deletar); 
app.put('/api/estoque/movimentar', authMiddleware(ADMIN_ROLES), produtoController.movimentarEstoque); // Movimentação Estoque (UC003)

// ** 2. Agendamentos e Serviços (UC006, UC010) **
app.post('/api/agendamentos/solicitar', authMiddleware(['CLIENTE']), agendamentoController.solicitar); // Cliente Agenda (UC006)
app.get('/api/agendamentos', authMiddleware(ALL_EMPLOYEES), agendamentoController.listarTodos); 
app.get('/api/agendamentos/meus', authMiddleware(['CLIENTE', 'MECANICO']), agendamentoController.listarMeus); 
app.put('/api/agendamentos/:id/executar', authMiddleware(['MECANICO']), agendamentoController.registrarExecucao); // Mecânico (UC010)
app.post('/api/agendamentos/:id/reservar_peca', authMiddleware(['MECANICO']), agendamentoController.reservarPeca); // Mecânico (UC007)
// Mecânico: filas
app.get('/api/agendamentos/abertos', authMiddleware(['MECANICO', ...ADMIN_ROLES]), agendamentoController.listarAbertos);
app.get('/api/agendamentos/ativos', authMiddleware(['MECANICO', ...ADMIN_ROLES]), agendamentoController.listarMeusAtivos);
app.put('/api/agendamentos/:id/assumir', authMiddleware(['MECANICO']), agendamentoController.assumir);
// Mecânico: gerenciar itens usados no serviço
app.get('/api/agendamentos/:id/itens', authMiddleware(['MECANICO']), agendamentoController.listarItens);
app.post('/api/agendamentos/:id/itens', authMiddleware(['MECANICO']), agendamentoController.adicionarItem);
app.delete('/api/agendamentos/:id/itens/:itemId', authMiddleware(['MECANICO']), agendamentoController.removerItem);
app.put('/api/agendamentos/:id/finalizar', authMiddleware(['MECANICO']), agendamentoController.finalizar);
app.get('/api/agendamentos/para-pagamento', authMiddleware(['ATENDENTE','MECANICO', ...ADMIN_ROLES]), agendamentoController.listarParaPagamento);
app.put('/api/agendamentos/:id/pagar', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), agendamentoController.marcarPago);
// Visão gerencial: agendamentos de hoje
app.get('/api/agendamentos/hoje', authMiddleware(ADMIN_ROLES), agendamentoController.listarHoje);

// ** 3. Vendas (UC004) **
app.post('/api/vendas', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), vendaController.registrarVenda); // Atendente/Gerente (UC004)
app.get('/api/vendas', authMiddleware(ADMIN_ROLES), vendaController.listarVendas); 

// ** 3.b Reservas (Fluxo de balcão) **
// ** 3.c Tickets de Suporte (Atendente) **
app.get('/api/tickets/abertos', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), ticketController.listarAbertos);
app.get('/api/tickets/assumidos', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), ticketController.listarAssumidos);
app.get('/api/tickets/:id', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), ticketController.obterDetalhes);
app.put('/api/tickets/:id/assumir', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), ticketController.assumir);
app.put('/api/tickets/:id/fechar', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), ticketController.fechar);
// Cliente cria a reserva com itens / Atendente cria reserva de balcão
app.post('/api/reservas', authMiddleware(['CLIENTE', 'ATENDENTE', ...ADMIN_ROLES]), reservaController.criar);
// Cliente lista suas próprias reservas
app.get('/api/reservas/minhas', authMiddleware(['CLIENTE']), reservaController.listarMinhas);
// Atendente lista pendentes
app.get('/api/reservas/pendentes', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), reservaController.listarPendentes);
// Atendente atualiza itens antes do pagamento
app.put('/api/reservas/:id/itens', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), reservaController.atualizarItens);
// Atendente marca pagamento
app.put('/api/reservas/:id/pagar', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), reservaController.marcarPaga);
// Atendente cancela
app.put('/api/reservas/:id/cancelar', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), reservaController.cancelar);
// Visão gerencial: reservas criadas ou para retirada hoje (deve vir antes da rota paramétrica)
app.get('/api/reservas/hoje', authMiddleware(ADMIN_ROLES), reservaController.listarHoje);
// Detalhe da reserva (cabeçalho + itens) - sem regex, ordem acima garante que 'hoje' não case aqui
app.get('/api/reservas/:id', authMiddleware(['ATENDENTE', ...ADMIN_ROLES]), reservaController.obter);

// ** 4. Clientes **
app.get('/api/clientes', authMiddleware(ALL_EMPLOYEES), clienteController.listarTodos);
app.put('/api/clientes/:id', authMiddleware(ADMIN_ROLES), clienteController.atualizar); 

// ** 5. Funcionários (UC009) **
app.get('/api/funcionarios', authMiddleware(ADMIN_ROLES), funcionarioController.listarTodos); // Consulta (UC009)
app.get('/api/funcionarios/:id', authMiddleware(ADMIN_ROLES), funcionarioController.buscarPorId);
app.post('/api/funcionarios', authMiddleware(OWNER_ROLES), funcionarioController.cadastrar); // Proprietário Cadastra
app.put('/api/funcionarios/:id', authMiddleware(OWNER_ROLES), funcionarioController.atualizar);

// ** 6. Relatórios (UC005) **
app.get('/api/relatorios/financeiro', authMiddleware(ADMIN_ROLES), (req, res) => relatorioController.gerarFinanceiro(req, res));
app.get('/api/relatorios/vendas', authMiddleware(ADMIN_ROLES), (req, res) => relatorioController.gerarVendas(req, res));
app.get('/api/relatorios/servicos', authMiddleware(ADMIN_ROLES), (req, res) => relatorioController.gerarServicos(req, res));
app.get('/api/relatorios/estoque', authMiddleware(ADMIN_ROLES), (req, res) => relatorioController.gerarEstoque(req, res));
app.get('/api/relatorios/eventos', authMiddleware(ADMIN_ROLES), (req, res) => relatorioController.gerarEventos(req, res));

// Rota de Bloqueio (UC009)
app.put('/api/funcionarios/:id/bloquear', authMiddleware(['GERENTE', 'PROPRIETARIO']), funcionarioController.blockUserAccess);

// ** Eventos (UC008) **
app.get('/api/eventos', authMiddleware(ADMIN_ROLES), eventoController.listar);
app.post('/api/eventos', authMiddleware(ADMIN_ROLES), eventoController.criar);
// Catálogo público de eventos (cliente pode visualizar sem login)
app.get('/api/eventos/public', eventoController.listar);
// Inscrição do cliente em evento
app.post('/api/eventos/:id/inscrever', authMiddleware(['CLIENTE']), eventoController.inscrever);
// Listar inscritos de um evento (gerente/proprietário)
app.get('/api/eventos/:id/inscritos', authMiddleware(ADMIN_ROLES), eventoController.listarInscritos);

// ** Catálogo de Serviços **
// Listagem pública (para clientes visualizarem no site)
app.get('/api/servicos/public', servicosController.listar);
// Rotas protegidas (Gerente/Proprietário)
app.get('/api/servicos', authMiddleware(ADMIN_ROLES), servicosController.listar);
app.get('/api/servicos/:id', authMiddleware(ADMIN_ROLES), servicosController.obter);
app.post('/api/servicos', authMiddleware(ADMIN_ROLES), servicosController.criar);
app.put('/api/servicos/:id', authMiddleware(ADMIN_ROLES), servicosController.atualizar);
app.delete('/api/servicos/:id', authMiddleware(ADMIN_ROLES), servicosController.deletar);

// Rotas públicas de catálogo
app.get('/api/produtos/public', produtoController.listarTodos);
app.get('/api/produtos/:id/public', produtoController.buscarPorId);

// Rota para usuário alterar sua própria senha (primeiro acesso ou mudança normal)
app.put('/api/usuarios/me/trocar-senha', authMiddleware(ANY_USER), authController.changePassword);

// Rota para obter informações do usuário autenticado (inclui trocar_senha)
app.get('/api/usuarios/me', authMiddleware(ANY_USER), authController.getUserInfo);

// Rota para atualizar dados básicos do usuário autenticado
app.put('/api/usuarios/me', authMiddleware(ANY_USER), authController.updateMyBasicInfo);

// =====================================================
// BACKEND PURO (API) — NÃO SERVE ARQUIVOS ESTÁTICOS
// O frontend roda em servidor próprio (public/server.js)
// =====================================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[BACKEND] API rodando em http://0.0.0.0:${PORT}`);
    try { await db.query('SELECT 1+1 AS result'); console.log('Conexão com PostgreSQL OK.'); } 
    catch (e) { console.error('Falha ao conectar ao PostgreSQL.'); }
    // Migração leve: garantir coluna de vínculo com agendamento em itemagendamento
    try {
        await db.query("ALTER TABLE itemagendamento ADD COLUMN IF NOT EXISTS idagendamento BIGINT REFERENCES agendamento(id) ON DELETE CASCADE;");
    } catch (e) {
        console.warn('Aviso: não foi possível aplicar migração leve de itemagendamento:', e.message);
    }
    // Migração: adiciona colunas de pagamento em agendamento
    try {
        await db.query("ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS metodopagamento VARCHAR(50);");
        await db.query("ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS datapagamento TIMESTAMP;");
        // Atualiza constraint de status para incluir PAGO
        await db.query("ALTER TABLE agendamento DROP CONSTRAINT IF EXISTS agendamento_status_check;");
        await db.query("ALTER TABLE agendamento ADD CONSTRAINT agendamento_status_check CHECK (status IN ('ABERTO', 'EM ANDAMENTO', 'PARA PAGAMENTO', 'PAGO', 'CONCLUIDO', 'CANCELADO'));");
    } catch (e) {
        console.warn('Aviso: não foi possível adicionar colunas de pagamento em agendamento:', e.message);
    }
});