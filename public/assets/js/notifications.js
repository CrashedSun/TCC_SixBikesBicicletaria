/**
 * Sistema de Notificações em Tempo Real
 * Gerencia toasts, badges e notificações do navegador
 */

const NotificationSystem = (() => {
    let toastContainer = null;
    let ticketBadgeCount = 0;
    let messageBadgeCount = 0;

    function ensureContainer() {
        if (toastContainer) return;
        toastContainer = document.createElement('div');
        toastContainer.id = 'notification-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    function showToast(message, type = 'info', duration = 5000) {
        ensureContainer();

        const toast = document.createElement('div');
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        toast.style.cssText = `
            margin-bottom: 10px;
            padding: 14px 18px;
            background: #28a745;
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
            font-size: 0.95rem;
            word-wrap: break-word;
        `;

        if (type === 'error') toast.style.background = '#dc3545';
        if (type === 'warning') toast.style.background = '#ffc107';
        if (type === 'info') toast.style.background = '#17a2b8';

        toast.textContent = message;
        toast.onclick = () => toast.remove();
        toastContainer.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }

    function showTicketAlert(ticket) {
        const nomeCliente = ticket?.nomeCliente || ticket?.nome || ticket?.nome_remetente || 'Cliente';
        const assunto = ticket?.assunto_resumido || ticket?.assunto || ticket?.titulo || 'Sem assunto';
        const ticketId = ticket?.idTicket || ticket?.id_ticket || ticket?.id || 'novo';
        const msg = `🎫 Novo ticket: ${nomeCliente}\n"${assunto}"`;
        showToast(msg, 'success', 8000);
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Novo Ticket! 🎫', {
                body: `${nomeCliente}: ${assunto || '...'}`,
                icon: '/assets/img/logo.png',
                badge: '/assets/img/logo.png',
                tag: `ticket-${ticketId}`,
                requireInteraction: true
            });
        }
    }

    function showMessageAlert(ticketId, senderName, preview) {
        const safePreview = String(preview || '');
        const msg = `💬 Mensagem de ${senderName}: ${safePreview.substring(0, 50)}${safePreview.length > 50 ? '...' : ''}`;
        showToast(msg, 'info', 6000);
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`💬 ${senderName}`, {
                body: safePreview.substring(0, 100),
                icon: '/assets/img/logo.png',
                badge: '/assets/img/logo.png',
                tag: `message-${ticketId}`,
                requireInteraction: false
            });
        }
    }

    function updateTicketBadge(count) {
        ticketBadgeCount = count;
        updateBrowserTab();
    }

    function updateMessageBadge(count) {
        messageBadgeCount = count;
        updateBrowserTab();
    }

    function updateBrowserTab() {
        const total = ticketBadgeCount + messageBadgeCount;
        if (total > 0) {
            document.title = `(${total}) Atendente - SixBikes`;
        } else {
            document.title = 'Atendente - SixBikes';
        }
    }

    function requestNotificationPermission() {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    function addStyles() {
        if (document.getElementById('notification-styles')) return;
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addStyles();
        });
    } else {
        addStyles();
    }

    return {
        showToast,
        showTicketAlert,
        showMessageAlert,
        updateTicketBadge,
        updateMessageBadge,
        requestNotificationPermission,
        ensureContainer
    };
})();

window.NotificationSystem = NotificationSystem;
