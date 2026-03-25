// server/index.js
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') }); 

const db = require('./config/database'); 
const authMiddleware = require('./middleware/authMiddleware');
const UsuarioRepository = require('./repositories/UsuarioRepository');
const AuditoriaRepository = require('./repositories/AuditoriaRepository');
const PasswordResetRepository = require('./repositories/PasswordResetRepository');
const SiteConfigService = require('./services/SiteConfigService');
const RealtimeService = require('./services/RealtimeService');

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
const reservaService = require('./services/ReservaService');
const servicosController = require('./controllers/ServicosController');
const eventoController = require('./controllers/EventoController');
const siteConfigController = require('./controllers/SiteConfigController');

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

// Fuso horário do Brasil: UTC-3 (Brasília Time)
// Horário de verão: UTC-2
// Offset positivo (180) para aplicar em subtrações SQL
const BRAZIL_TIMEZONE_OFFSET_MINUTES = 180;

process.on('unhandledRejection', async (reason) => {
    const msg = reason && reason.message ? reason.message : String(reason);
    console.error('[PROCESS] unhandledRejection:', msg);
    try {
        await AuditoriaRepository.create({
            nivel: 'ERROR',
            acao: 'SYSTEM_UNHANDLED_REJECTION',
            recurso: 'SISTEMA',
            mensagem: msg,
            detalhes: { stack: reason && reason.stack ? reason.stack : null },
        });
    } catch (_) {}
});

process.on('uncaughtException', async (error) => {
    console.error('[PROCESS] uncaughtException:', error.message);
    try {
        await AuditoriaRepository.create({
            nivel: 'ERROR',
            acao: 'SYSTEM_UNCAUGHT_EXCEPTION',
            recurso: 'SISTEMA',
            mensagem: error.message,
            detalhes: { stack: error.stack || null },
        });
    } catch (_) {}
});

// CORS com credenciais permitidas
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Aumenta o limite de JSON para permitir imagens em base64 no cadastro de produto
app.use(express.json({ limit: '10mb' })); 

// Middleware para adicionar headers CORS explícitos para imagens
app.use('/assets/img', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cache-Control', 'public, max-age=86400');
    next();
}, express.static(path.join(process.cwd(), 'public', 'assets', 'img')));
// Compatibilidade com links legados
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cache-Control', 'public, max-age=86400');
    next();
}, express.static(path.join(process.cwd(), 'public', 'assets', 'img')));

function sanitizeAuditBody(value) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(sanitizeAuditBody);
    if (typeof value !== 'object') return value;

    const maskedKeys = ['senha', 'novaSenha', 'senha_hash', 'password', 'token', 'authorization'];
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
        if (maskedKeys.includes(String(k))) {
            out[k] = '***';
        } else {
            out[k] = sanitizeAuditBody(v);
        }
    });
    return out;
}

function inferAuditAction(req) {
    const method = (req.method || 'GET').toUpperCase();
    if (req.path === '/api/login') return 'AUTH_LOGIN';
    if (req.path.includes('/trocar-senha')) return 'AUTH_PASSWORD_CHANGE';
    if (method === 'GET') return 'REQUEST_READ';
    if (method === 'POST') return 'REQUEST_CREATE';
    if (method === 'PUT' || method === 'PATCH') return 'REQUEST_UPDATE';
    if (method === 'DELETE') return 'REQUEST_DELETE';
    return 'REQUEST';
}

function inferAuditResource(pathname = '') {
    if (pathname.startsWith('/api/produtos') || pathname.startsWith('/api/estoque')) return 'ESTOQUE';
    if (pathname.startsWith('/api/servicos')) return 'SERVICOS';
    if (pathname.startsWith('/api/agendamentos')) return 'AGENDAMENTOS';
    if (pathname.startsWith('/api/reservas')) return 'RESERVAS';
    if (pathname.startsWith('/api/tickets')) return 'TICKETS';
    if (pathname.startsWith('/api/eventos')) return 'EVENTOS';
    if (pathname.startsWith('/api/clientes')) return 'CLIENTES';
    if (pathname.startsWith('/api/funcionarios')) return 'FUNCIONARIOS';
    if (pathname.startsWith('/api/usuarios')) return 'USUARIOS';
    if (pathname.startsWith('/api/relatorios')) return 'RELATORIOS';
    if (pathname.startsWith('/api/login')) return 'AUTH';
    return 'SISTEMA';
}

function normalizeAuditDateFilter(inputValue, isEndRange = false, tzOffsetMinutes = null) {
    if (!inputValue) return null;
    const raw = String(inputValue).trim();
    if (!raw) return null;

    const hasTimezone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(raw);
    let parsed;

    if (hasTimezone) {
        parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;
    } else {
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
        if (!match) return null;

        const [, y, mo, d, h, mi, s = '0', ms = '0'] = match;
        const baseMs = Date.UTC(
            Number(y),
            Number(mo) - 1,
            Number(d),
            Number(h),
            Number(mi),
            Number(s),
            Number(ms.padEnd(3, '0'))
        );

        const offset = Number.isFinite(Number(tzOffsetMinutes)) ? Number(tzOffsetMinutes) : 0;
        parsed = new Date(baseMs - (offset * 60000));
    }

    if (isEndRange && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
        parsed = new Date(parsed.getTime() + 59999);
    }

    return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

async function resolveAuditActor(req) {
    if (req.user?.id) {
        return {
            usuarioId: Number(req.user.id),
            usuarioPerfil: req.user.perfil || null,
            usuarioEmail: req.user.email || null,
        };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { usuarioId: null, usuarioPerfil: null, usuarioEmail: null };

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return {
            usuarioId: Number(decoded.id) || null,
            usuarioPerfil: decoded.perfil || null,
            usuarioEmail: null,
        };
    } catch (_) {
        return { usuarioId: null, usuarioPerfil: null, usuarioEmail: null };
    }
}

// Captura o payload de resposta para enriquecer logs de erro.
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        res.locals.__responseBody = body;
        return originalJson(body);
    };
    next();
});

// Auditoria global de requests/respostas (todos os usuários, incluindo login e erros).
app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    const startedAt = Date.now();

    res.on('finish', async () => {
        if (!req.path || !req.path.startsWith('/api/')) return;
        if (req.path.startsWith('/api/realtime/stream')) return;
        if (req.path === '/api/login' && req.__loginAuditHandled) return;

        const status = res.statusCode || 0;
        const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
        const actor = await resolveAuditActor(req);
        const responseBody = res.locals.__responseBody || {};

        try {
            await AuditoriaRepository.create({
                requestId,
                nivel: level,
                acao: inferAuditAction(req),
                recurso: inferAuditResource(req.path),
                metodo: req.method,
                rota: req.originalUrl || req.path,
                statusCode: status,
                usuarioId: actor.usuarioId,
                usuarioPerfil: actor.usuarioPerfil,
                usuarioEmail: actor.usuarioEmail,
                ip: req.ip,
                userAgent: req.get('user-agent') || null,
                mensagem: responseBody.error || responseBody.message || null,
                detalhes: {
                    requestId,
                    durationMs: Date.now() - startedAt,
                    query: sanitizeAuditBody(req.query || {}),
                    body: sanitizeAuditBody(req.body || {}),
                },
            });
        } catch (e) {
            console.warn('[AUDITORIA] Falha ao registrar log:', e.message);
        }
    });

    next();
});

// Trigger genérico: qualquer mutação bem-sucedida publica escopo afetado para atualização parcial no frontend.
app.use((req, res, next) => {
    res.on('finish', () => {
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
        if (res.statusCode >= 400) return;
        if (!req.path || !req.path.startsWith('/api/')) return;
        if (req.path.startsWith('/api/realtime/stream')) return;
        if (req.path.startsWith('/api/login')) return;

        let scope = null;
        if (req.path.startsWith('/api/produtos') || req.path.startsWith('/api/estoque')) scope = 'estoque';
        else if (req.path.startsWith('/api/servicos')) scope = 'servicos';
        else if (req.path.startsWith('/api/agendamentos')) scope = 'agendamentos';
        else if (req.path.startsWith('/api/reservas')) scope = 'reservas';
        else if (req.path.startsWith('/api/tickets')) scope = 'tickets';
        else if (req.path.startsWith('/api/eventos')) scope = 'eventos';
        else if (req.path.startsWith('/api/clientes')) scope = 'clientes';
        else if (req.path.startsWith('/api/funcionarios')) scope = 'funcionarios';
        else if (req.path.startsWith('/api/usuarios')) scope = 'usuarios';
        else if (req.path.startsWith('/api/site-config')) scope = 'site-config';

        if (scope) {
            RealtimeService.publish(`${scope}.changed`, {
                scope,
                method: req.method,
                path: req.path
            });
        }
    });
    next();
});

// --- ROTAS ABERTAS (Acesso Público) ---
app.post('/api/login', authController.handleLogin); // UC001
app.post('/api/auth/recuperar-senha/solicitar', authController.requestPasswordReset);
app.post('/api/auth/recuperar-senha/confirmar', authController.confirmPasswordReset);
app.post('/api/clientes/registro', clienteController.handleRegistro); // RF013
// Tickets: criação exige usuário logado (apenas CLIENTE)
app.post('/api/tickets', authMiddleware(['CLIENTE']), ticketController.handleNewTicket);
// Catálogo público de produtos (acesso sem autenticação)
app.get('/api/produtos/public', produtoController.listarTodos);
// Configuracoes publicas da home/rodape
app.get('/api/site-config/public', siteConfigController.getPublic);

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
// Configuracao do site (somente proprietario)
app.get('/api/site-config', authMiddleware(OWNER_ROLES), siteConfigController.getForOwner);
app.put('/api/site-config', authMiddleware(OWNER_ROLES), siteConfigController.update);
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

// SSE de atualizações incrementais (frontend atualiza apenas blocos afetados)
app.get('/api/realtime/stream', async (req, res) => {
    const token = req.query.token;
    try {
        let context = { perfil: 'PUBLICO' };
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UsuarioRepository.findById(decoded.id);
            if (!user || user.ativo === false) {
                return res.status(403).json({ error: 'Usuário inválido ou inativo.' });
            }
            context = { userId: user.id, perfil: user.tipoPerfil };
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Accel-Buffering', 'no');
        if (res.flushHeaders) {
            res.flushHeaders();
        }

        const unsubscribe = RealtimeService.subscribe(res, context);

        req.on('close', () => {
            unsubscribe();
            if (!res.writableEnded) {
                res.end();
            }
        });
        
        req.on('error', () => {
            unsubscribe();
            if (!res.writableEnded) {
                res.end();
            }
        });
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
});

// Rota para usuário alterar sua própria senha (primeiro acesso ou mudança normal)
app.put('/api/usuarios/me/trocar-senha', authMiddleware(ANY_USER), authController.changePassword);

// Rota para obter informações do usuário autenticado (inclui trocar_senha)
app.get('/api/usuarios/me', authMiddleware(ANY_USER), authController.getUserInfo);

// Rota para atualizar dados básicos do usuário autenticado
app.put('/api/usuarios/me', authMiddleware(ANY_USER), authController.updateMyBasicInfo);

// Auditoria global (somente gerente/proprietário)
app.get('/api/auditoria/logs', authMiddleware(ADMIN_ROLES), async (req, res) => {
    try {
        // Sempre usa fuso horário do Brasil (UTC-3 = -180 minutos)
        const de = normalizeAuditDateFilter(req.query.de, false, BRAZIL_TIMEZONE_OFFSET_MINUTES);
        const ate = normalizeAuditDateFilter(req.query.ate, true, BRAZIL_TIMEZONE_OFFSET_MINUTES);

        const data = await AuditoriaRepository.list({
            limit: req.query.limit,
            offset: req.query.offset,
            nivel: req.query.nivel,
            metodo: req.query.metodo,
            statusCode: req.query.statusCode,
            usuarioId: req.query.usuarioId,
            acao: req.query.acao,
            rota: req.query.rota,
            q: req.query.q,
            de,
            ate,
        });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Falha ao consultar logs de auditoria.' });
    }
});

// Consulta de processos de banco (ativos/histórico/duplicados), para observabilidade operacional.
app.get('/api/processos/db', authMiddleware(ADMIN_ROLES), async (req, res) => {
    try {
        const limit = Number(req.query.limit || 50);
        const type = req.query.type ? String(req.query.type).toUpperCase() : null;

        const [pgProcesses, duplicatePgProcesses] = await Promise.all([
            db.getDatabaseProcesses(),
            db.getDuplicateDatabaseProcesses(),
        ]);

        res.json({
            success: true,
            data: {
                ativosApi: db.getActiveProcesses(),
                historicoApi: db.getProcessHistory(limit, type),
                processosPostgres: pgProcesses,
                processosDuplicadosPostgres: duplicatePgProcesses,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Falha ao consultar processos de banco.',
        });
    }
});

// =====================================================
// BACKEND PURO (API) — NÃO SERVE ARQUIVOS ESTÁTICOS
// O frontend roda em servidor próprio (public/server.js)
// =====================================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[BACKEND] API rodando em http://0.0.0.0:${PORT}`);
    try { await db.query('SELECT 1+1 AS result'); console.log('Conexão com PostgreSQL OK.'); } 
    catch (e) { console.error('Falha ao conectar ao PostgreSQL.'); }

    try {
        await AuditoriaRepository.ensureTable();
        console.log('Tabela de auditoria pronta.');
    } catch (e) {
        console.error('Falha ao garantir tabela de auditoria:', e.message);
    }

    try {
        await PasswordResetRepository.ensureTable();
        console.log('Tabela de recuperação de senha pronta.');
    } catch (e) {
        console.error('Falha ao garantir tabela de recuperação de senha:', e.message);
    }

    try {
        await SiteConfigService.ensureTable();
        console.log('Tabela de configuracao do site pronta.');
    } catch (e) {
        console.error('Falha ao garantir tabela de configuracao do site:', e.message);
    }

    // Job: expirar reservas com prazo vencido ao iniciar e a cada hora
    const expirarReservas = async () => {
        try {
            const n = await reservaService.expirarVencidas();
            if (n > 0) console.log(`[Reservas] ${n} reserva(s) expirada(s) por prazo vencido.`);
        } catch (e) { console.warn('[Reservas] Erro ao expirar reservas:', e.message); }
    };
    expirarReservas();
    setInterval(expirarReservas, 60 * 60 * 1000); // verifica a cada 1 hora
});