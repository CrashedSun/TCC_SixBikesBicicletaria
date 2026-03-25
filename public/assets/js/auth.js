// public/assets/js/auth.js (Código completo)

// Exponha a URL base da API globalmente e mantenha uma cópia local
// Usa o hostname atual para funcionar em qualquer dispositivo na rede
window.API_BASE_URL = window.API_BASE_URL || (window.location.protocol + '//' + window.location.hostname + ':8080/api');
const API_BASE_URL = window.API_BASE_URL;
const API_CACHE_PREFIX = 'cache:api:';
const API_CACHE_TTL_MS = 2 * 60 * 1000;

function installStyledPopupSystem() {
    if (window.__sbStyledPopupInstalled) return;
    window.__sbStyledPopupInstalled = true;

    const style = document.createElement('style');
    style.textContent = `
        .sb-popup-wrap {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(15, 22, 17, 0.45);
            z-index: 7000;
            padding: 16px;
            opacity: 0;
            pointer-events: none;
            transition: opacity .18s ease;
        }
        .sb-popup-wrap.open {
            opacity: 1;
            pointer-events: auto;
        }
        .sb-popup {
            width: min(92vw, 460px);
            border-radius: 14px;
            background: #ffffff;
            border: 1px solid #dce6df;
            box-shadow: 0 16px 36px rgba(0,0,0,.22);
            transform: translateY(8px) scale(.98);
            transition: transform .18s ease;
            overflow: hidden;
            font-family: Arial, Helvetica, sans-serif;
        }
        .sb-popup-wrap.open .sb-popup {
            transform: translateY(0) scale(1);
        }
        .sb-popup-head {
            padding: 11px 14px;
            font-weight: 700;
            color: #fff;
            font-size: 15px;
        }
        .sb-popup.info .sb-popup-head { background: #2f8f5b; }
        .sb-popup.warn .sb-popup-head { background: #d79a14; }
        .sb-popup.error .sb-popup-head { background: #c94141; }
        .sb-popup-body {
            padding: 14px;
            font-size: 14px;
            color: #1d2a21;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .sb-popup-foot {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 0 14px 14px;
        }
        .sb-popup-btn {
            border: 0;
            border-radius: 8px;
            padding: 8px 14px;
            font-weight: 600;
            color: #fff;
            background: #2f8f5b;
            cursor: pointer;
        }
        .sb-popup-btn.secondary {
            background: #7a8a80;
        }
        .sb-popup.error .sb-popup-btn { background: #c94141; }
        .sb-popup.warn .sb-popup-btn { background: #d79a14; }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'sb-popup-wrap';
    wrap.innerHTML = `
        <div class="sb-popup info" role="alertdialog" aria-modal="true" aria-live="assertive">
            <div class="sb-popup-head">Aviso</div>
            <div class="sb-popup-body"></div>
            <div class="sb-popup-foot">
                <button type="button" class="sb-popup-btn">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    const popup = wrap.querySelector('.sb-popup');
    const title = wrap.querySelector('.sb-popup-head');
    const body = wrap.querySelector('.sb-popup-body');
    const okBtn = wrap.querySelector('.sb-popup-btn');

    const confirmWrap = document.createElement('div');
    confirmWrap.className = 'sb-popup-wrap';
    confirmWrap.innerHTML = `
        <div class="sb-popup warn" role="dialog" aria-modal="true" aria-live="assertive">
            <div class="sb-popup-head">Confirmação</div>
            <div class="sb-popup-body"></div>
            <div class="sb-popup-foot">
                <button type="button" class="sb-popup-btn secondary" data-action="cancelar">Cancelar</button>
                <button type="button" class="sb-popup-btn" data-action="confirmar">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmWrap);

    const confirmPopup = confirmWrap.querySelector('.sb-popup');
    const confirmTitle = confirmWrap.querySelector('.sb-popup-head');
    const confirmBody = confirmWrap.querySelector('.sb-popup-body');
    const confirmCancelBtn = confirmWrap.querySelector('button[data-action="cancelar"]');
    const confirmOkBtn = confirmWrap.querySelector('button[data-action="confirmar"]');
    let confirmResolver = null;

    function inferType(message) {
        const m = String(message || '').toLowerCase();
        if (m.includes('erro') || m.includes('falha') || m.includes('inválid') || m.includes('negado')) return 'error';
        if (m.includes('atenç') || m.includes('aviso') || m.includes('permissão') || m.includes('expirad')) return 'warn';
        return 'info';
    }

    function inferTitle(type) {
        if (type === 'error') return 'Erro';
        if (type === 'warn') return 'Atenção';
        return 'Informação';
    }

    function closePopup() {
        wrap.classList.remove('open');
    }

    function closeConfirm(result) {
        confirmWrap.classList.remove('open');
        if (confirmResolver) {
            confirmResolver(Boolean(result));
            confirmResolver = null;
        }
    }

    okBtn.addEventListener('click', closePopup);
    wrap.addEventListener('click', (ev) => {
        if (ev.target === wrap) closePopup();
    });
    confirmWrap.addEventListener('click', (ev) => {
        if (ev.target === confirmWrap) closeConfirm(false);
    });
    confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
    confirmOkBtn.addEventListener('click', () => closeConfirm(true));
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && wrap.classList.contains('open')) closePopup();
        if (ev.key === 'Escape' && confirmWrap.classList.contains('open')) closeConfirm(false);
    });

    window.showStyledPopup = function showStyledPopup(message, type = null, customTitle = null) {
        const resolvedType = type || inferType(message);
        popup.className = `sb-popup ${resolvedType}`;
        title.textContent = customTitle || inferTitle(resolvedType);
        body.textContent = String(message || 'Operação concluída.');
        wrap.classList.add('open');
    };

    window.showStyledConfirm = function showStyledConfirm(message, options = {}) {
        const type = options.type || 'warn';
        confirmPopup.className = `sb-popup ${type}`;
        confirmTitle.textContent = options.title || 'Confirmação';
        confirmBody.textContent = String(message || 'Deseja confirmar a ação?');
        confirmOkBtn.textContent = options.confirmText || 'Confirmar';
        confirmCancelBtn.textContent = options.cancelText || 'Cancelar';
        confirmWrap.classList.add('open');
        return new Promise((resolve) => {
            confirmResolver = resolve;
        });
    };

    window.__nativeAlert = window.alert ? window.alert.bind(window) : null;
    window.__nativeConfirm = window.confirm ? window.confirm.bind(window) : null;
    window.alert = function styledAlert(message) {
        if (typeof window.showStyledPopup === 'function') {
            window.showStyledPopup(message);
            return;
        }
        if (window.__nativeAlert) window.__nativeAlert(message);
    };
}

window.installStyledPopupSystem = installStyledPopupSystem;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installStyledPopupSystem, { once: true });
} else {
    installStyledPopupSystem();
}

function normalizeEndpoint(url) {
    if (/^https?:\/\//i.test(url)) return url;
    const base = API_BASE_URL.replace(/\/$/, '');
    if (url.startsWith('/')) {
        if (base.endsWith('/api') && url.startsWith('/api')) return base + url.slice(4);
        return base + url;
    }
    return base + '/' + url;
}

function apiCacheKey(endpoint) {
    return API_CACHE_PREFIX + endpoint;
}

function getCachedApi(endpoint) {
    try {
        const raw = localStorage.getItem(apiCacheKey(endpoint));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.ts !== 'number') return null;
        if (Date.now() - parsed.ts > API_CACHE_TTL_MS) return null;
        return parsed.data;
    } catch (_) {
        return null;
    }
}

function setCachedApi(endpoint, data) {
    try {
        localStorage.setItem(apiCacheKey(endpoint), JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
}

function invalidateApiCacheByScope(scope) {
    const prefixes = {
        estoque: ['/produtos', '/estoque'],
        servicos: ['/servicos'],
        agendamentos: ['/agendamentos'],
        reservas: ['/reservas'],
        tickets: ['/tickets'],
        eventos: ['/eventos'],
        clientes: ['/clientes'],
        funcionarios: ['/funcionarios'],
        usuarios: ['/usuarios'],
        'site-config': ['/site-config']
    };

    const related = prefixes[scope] || [];
    if (!related.length) return;

    try {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(API_CACHE_PREFIX)) continue;
            const endpoint = k.slice(API_CACHE_PREFIX.length);
            if (related.some(p => endpoint.includes('/api' + p))) {
                keysToDelete.push(k);
            }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
}

function inferScopeFromRealtimeEvent(evt) {
    if (evt?.payload?.scope) return evt.payload.scope;
    const t = String(evt?.type || '').toLowerCase();
    if (t.startsWith('produto.') || t.startsWith('estoque.')) return 'estoque';
    if (t.startsWith('servico.') || t.startsWith('servicos.')) return 'servicos';
    if (t.startsWith('agendamento.')) return 'agendamentos';
    if (t.startsWith('reserva.')) return 'reservas';
    if (t.startsWith('ticket.')) return 'tickets';
    if (t.startsWith('evento.')) return 'eventos';
    if (t.startsWith('cliente.')) return 'clientes';
    if (t.startsWith('funcionario.')) return 'funcionarios';
    if (t.startsWith('usuario.')) return 'usuarios';
    if (t.startsWith('site-config.') || t.startsWith('siteconfig.')) return 'site-config';
    return null;
}

function logout() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("userToken");
    localStorage.removeItem("userProfile");
    window.location.href = "login.html";
}

function checkRestrictedAccess() {
    const perfil = localStorage.getItem('userProfile');
    const token = localStorage.getItem('userToken');
    const path = window.location.pathname;

    // Páginas públicas que não requerem token (nunca redirecionam)
    const publicPages = ['login.html', 'registro.html', 'index.html', 'contato.html', 'produtos.html', 'servicos.html', 'eventos.html', 'shop-single.html', 'carrinho.html', 'produto-unico.html', 'senha.html', 'redefinir-senha.html'];
    const currentPage = path.split('/').pop();
    
    // Se for página pública, não faz nada
    if (publicPages.some(p => currentPage.includes(p))) {
        return true;
    }

    // Páginas que exigem autenticação (perfil.html e páginas de funcionários)
    if (!token || !perfil) {
        // Não está autenticado e está tentando acessar página restrita
        alert('Você precisa estar logado para acessar esta página.');
        window.location.href = 'login.html';
        return false;
    }

    // RNF002: Verifica permissões para páginas restritas por perfil
    const restrictedPages = {
        'gerencia.html': ['PROPRIETARIO', 'GERENTE'],
        'mecanico.html': ['MECANICO'],
        'atendente.html': ['ATENDENTE']
    };

    if (restrictedPages[currentPage]) {
        if (!restrictedPages[currentPage].includes(perfil.toUpperCase())) {
            alert('Acesso Negado: Seu perfil não tem permissão para esta página.');
            window.location.href = 'index.html'; 
            return false;
        }
    }
    return true;
}


async function fetchAuthenticated(url, method = 'GET', body = null) {
    if (!checkRestrictedAccess()) { 
        throw new Error('Acesso interrompido pelo frontend.');
    }
    
    const token = localStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    const config = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    };
    const endpoint = normalizeEndpoint(url);
    const methodUpper = String(method || 'GET').toUpperCase();
    const isGet = methodUpper === 'GET' && !body;

    if (isGet) {
        const cached = getCachedApi(endpoint);
        if (cached !== null) {
            return cached;
        }
    }

    try {
        const response = await fetch(endpoint, config);
        
        // Trata erros de autenticação (401) ou autorização (403) - RNF001, RNF002
        if (response.status === 401 || response.status === 403) {
            // Tenta obter mensagem detalhada do backend para ajudar no debug
            let serverMsg = 'Falha de Autenticação/Autorização no Backend.';
            try {
                const errBody = await response.json();
                serverMsg = errBody.error || errBody.message || serverMsg;
            } catch (e) {
                // corpo não-JSON ou vazio: manter mensagem genérica
            }

            // Mostra a mensagem retornada pelo backend ao usuário antes de decidir logout
            alert(`Sessão inválida/sem permissão: ${serverMsg}`);

            // Se for token inválido/expirado, efetua logout; caso contrário, apenas rejeita a promise
            const lower = (serverMsg || '').toString().toLowerCase();
            if (lower.includes('token') || lower.includes('expirad') || lower.includes('inválid')) {
                logout();
            }

            throw new Error(serverMsg);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `Erro na requisição: ${response.status}`);
        }

        const result = await response.json();

        if (isGet) {
            setCachedApi(endpoint, result);
        } else {
            const pathNoBase = endpoint.replace(API_BASE_URL.replace(/\/$/, ''), '');
            const scopeByPath = pathNoBase.startsWith('/produtos') || pathNoBase.startsWith('/estoque') ? 'estoque'
                : pathNoBase.startsWith('/servicos') ? 'servicos'
                : pathNoBase.startsWith('/agendamentos') ? 'agendamentos'
                : pathNoBase.startsWith('/reservas') ? 'reservas'
                : pathNoBase.startsWith('/tickets') ? 'tickets'
                : pathNoBase.startsWith('/eventos') ? 'eventos'
                : pathNoBase.startsWith('/clientes') ? 'clientes'
                : pathNoBase.startsWith('/funcionarios') ? 'funcionarios'
                : pathNoBase.startsWith('/usuarios') ? 'usuarios'
                : pathNoBase.startsWith('/site-config') ? 'site-config'
                : null;
            if (scopeByPath) invalidateApiCacheByScope(scopeByPath);
        }

        return result;
    } catch (error) {
        console.error('Erro na requisição autenticada:', error);
        throw error;
    }
}

// Canal SSE autenticado para receber triggers incrementais do backend
window.openRealtimeStream = function openRealtimeStream(onEvent) {
    const token = localStorage.getItem('userToken');
    const streamUrl = token
        ? `${API_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/realtime/stream`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            const scope = inferScopeFromRealtimeEvent(payload);
            if (scope) invalidateApiCacheByScope(scope);
            window.dispatchEvent(new CustomEvent('sb:realtime', { detail: payload }));
            if (typeof onEvent === 'function') onEvent(payload);
        } catch (e) {
            console.warn('Evento realtime inválido:', e.message);
        }
    };

    es.onerror = () => {
        // O EventSource já tenta reconectar automaticamente.
    };

    return es;
};

function initRealtimeGlobal() {
    if (window.__realtimeGlobalStarted) return;
    window.__realtimeGlobalStarted = true;
    window.__realtimeGlobalStream = window.openRealtimeStream();
}

function initGridImageZoom() {
    if (window.__gridImageZoomStarted) return;
    window.__gridImageZoomStarted = true;

    const style = document.createElement('style');
    style.textContent = `
        .sb-image-zoomable {
            cursor: zoom-in;
        }
        .sb-image-zoom-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.86);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 5000;
            padding: 20px;
        }
        .sb-image-zoom-overlay.open {
            display: flex;
        }
        .sb-image-zoom-view {
            position: relative;
            max-width: min(94vw, 1600px);
            max-height: 94vh;
        }
        .sb-image-zoom-view img {
            display: block;
            width: auto;
            height: auto;
            max-width: 94vw;
            max-height: 94vh;
            border-radius: 10px;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
            object-fit: contain;
        }
        .sb-image-zoom-close {
            position: absolute;
            top: -14px;
            right: -14px;
            width: 32px;
            height: 32px;
            border: 0;
            border-radius: 50%;
            background: #ffffff;
            color: #222;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'sb-image-zoom-overlay';
    overlay.innerHTML = `
        <div class="sb-image-zoom-view" role="dialog" aria-modal="true" aria-label="Visualização de imagem ampliada">
            <button type="button" class="sb-image-zoom-close" aria-label="Fechar">&times;</button>
            <img alt="Imagem ampliada" src="">
        </div>
    `;
    document.body.appendChild(overlay);

    const zoomImg = overlay.querySelector('img');
    const closeBtn = overlay.querySelector('.sb-image-zoom-close');

    function closeZoom() {
        overlay.classList.remove('open');
        zoomImg.setAttribute('src', '');
    }

    function isGridImage(img) {
        if (!(img instanceof HTMLImageElement)) return false;
        if (!img.src) return false;
        if (img.closest('[data-no-zoom], .no-zoom, .navbar-brand, .carousel-item, #template-mo-zay-hero-carousel')) {
            return false;
        }

        if (img.closest('table, .table-responsive, .product-wap, .estoque-item-card, .servico-item-card')) {
            return true;
        }

        const idHost = img.closest('[id]');
        const id = (idHost && idHost.id ? idHost.id.toLowerCase() : '');
        if (id.includes('grid') || id.includes('table') || id.includes('cards')) {
            return true;
        }

        const cls = (img.closest('[class]')?.className || '').toString().toLowerCase();
        return cls.includes('grid') || cls.includes('cards');
    }

    document.addEventListener('click', (event) => {
        const img = event.target instanceof HTMLElement ? event.target.closest('img') : null;
        if (!img || !isGridImage(img)) return;

        img.classList.add('sb-image-zoomable');
        overlay.classList.add('open');
        zoomImg.setAttribute('src', img.currentSrc || img.src);
        zoomImg.setAttribute('alt', img.alt || 'Imagem ampliada');
    });

    closeBtn.addEventListener('click', closeZoom);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeZoom();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('open')) {
            closeZoom();
        }
    });
}

// Estado temporário para fluxo de primeira troca de senha
window._pendingFirstLogin = null;

async function performLogin(email, senha, novaSenha = null) {
    try {
        const payload = { email, senha };
        if (novaSenha) { payload.novaSenha = novaSenha; }
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro desconhecido no login.');
        }
        
        // Armazena dados essenciais para as checagens de acesso
        localStorage.setItem('usuario', data.nome);
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userProfile', data.perfil);
        localStorage.setItem('mustChangePassword', data.trocarSenha ? '1' : '0');

        // Se precisar trocar senha e ainda não foi enviada novaSenha, ativa segundo passo no login
        if (data.trocarSenha && !novaSenha) {
            window._pendingFirstLogin = { email, senha };
            // Dispara evento para a página de login montar UI de nova senha
            window.dispatchEvent(new CustomEvent('requirePasswordChange', { detail: { email } }));
            return; // Não redireciona ainda
        }

        // Redirecionamento normal se não precisa trocar senha
        switch (data.perfil.toUpperCase()) {
            case 'PROPRIETARIO':
            case 'GERENTE':
                window.location.href = 'gerencia.html';
                break;
            case 'MECANICO':
                window.location.href = 'mecanico.html';
                break;
            case 'ATENDENTE':
                window.location.href = 'atendente.html';
                break;
            default:
                window.location.href = 'index.html'; 
                break;
        }

    } catch (error) {
        console.error('Falha no login:', error);
        alert('Falha ao autenticar: ' + (error.message || 'Erro de conexão.'));
    }
}

// Verifica server-side se usuário deve trocar senha no primeiro acesso
async function checkAndShowChangePasswordModal() {
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('registro.html')) {
        return;
    }
    try {
        const userInfo = await fetchAuthenticated('/usuarios/me', 'GET');
        if (userInfo.trocarSenha) {
            localStorage.setItem('mustChangePassword', '1');
            window.dispatchEvent(new CustomEvent('mustChangePassword', { detail: userInfo }));
        } else {
            localStorage.setItem('mustChangePassword', '0');
        }
    } catch (error) {
        console.warn('Falha ao verificar trocar_senha no servidor:', error.message);
    }
}

// Inicia a verificação de acesso ao carregar páginas
if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('registro.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        initRealtimeGlobal();
        initGridImageZoom();
        // Verifica acesso apenas se necessário (páginas restritas)
        const path = window.location.pathname;
        const currentPage = path.split('/').pop();
        const restrictedPages = ['gerencia.html', 'mecanico.html', 'atendente.html', 'perfil.html'];
        if (restrictedPages.some(p => currentPage.includes(p))) {
            checkRestrictedAccess();
            checkAndShowChangePasswordModal();
        }
        // Ajusta link do ícone de usuário dinamicamente
        try {
            const token = localStorage.getItem('userToken');
            const perfil = localStorage.getItem('userProfile');
            // Procura âncora que contenha ícone de usuário
            let userAnchor = document.querySelector('a i.fa-user')?.closest('a');
            // Em algumas páginas podemos ter id explícito
            if(!userAnchor){ userAnchor = document.getElementById('nav-user-link'); }
            if (userAnchor) {
                if (token && perfil) {
                    userAnchor.setAttribute('href', 'perfil.html');
                } else {
                    userAnchor.setAttribute('href', 'login.html');
                }
            }
        } catch(e){ console.warn('Falha ao ajustar link de perfil:', e.message); }
    });
}
