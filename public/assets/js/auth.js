// public/assets/js/auth.js (Código completo)

// Exponha a URL base da API globalmente e mantenha uma cópia local
// Usa o hostname atual para funcionar em qualquer dispositivo na rede
window.API_BASE_URL = window.API_BASE_URL || (window.location.protocol + '//' + window.location.hostname + ':8080/api');
const API_BASE_URL = window.API_BASE_URL;

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
    const publicPages = ['login.html', 'registro.html', 'index.html', 'contato.html', 'produtos.html', 'servicos.html', 'eventos.html', 'shop-single.html', 'carrinho.html', 'produto-unico.html', 'senha.html'];
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

    try {
        // Normaliza o endpoint evitando duplicação de segmentos como '/api/api'
        let endpoint = url;
        if (!/^https?:\/\//i.test(url)) {
            const base = API_BASE_URL.replace(/\/$/, '');
            if (url.startsWith('/')) {
                // Se o base termina com '/api' e a url começa com '/api', remova a duplicação
                if (base.endsWith('/api') && url.startsWith('/api')) {
                    endpoint = base + url.slice(4);
                } else {
                    endpoint = base + url;
                }
            } else {
                endpoint = base + '/' + url;
            }
        }

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

        return await response.json();
    } catch (error) {
        console.error('Erro na requisição autenticada:', error);
        throw error;
    }
}

// Estado temporário para fluxo de primeira troca de senha
window._pendingFirstLogin = null;

async function performLogin(login, senha, novaSenha = null) {
    try {
        const payload = { login, senha };
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
            window._pendingFirstLogin = { login, senha };
            // Dispara evento para a página de login montar UI de nova senha
            window.dispatchEvent(new CustomEvent('requirePasswordChange', { detail: { login } }));
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
