const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.enabled = false;
        this._init();
    }

    _init() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            this.enabled = false;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass },
        });
        this.enabled = true;
    }

    _buildSender() {
        return {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.SMTP_USER,
        };
    }

    async sendMail({ to, subject, html, text }) {
        if (!this.enabled) {
            console.warn(`[EMAIL] SMTP não configurado. E-mail suprimido para ${to}. Assunto: ${subject}`);
            return { skipped: true };
        }

        const sender = this._buildSender();
        return this.transporter.sendMail({
            ...sender,
            to,
            subject,
            html,
            text,
        });
    }

    async sendPasswordResetEmail({ to, nome, resetLink, ttlMinutes }) {
        const safeName = nome || 'usuário';
        const subject = 'Recuperação de senha - Six Bikes';
        const text = [
            `Olá, ${safeName}.`,
            'Recebemos um pedido para redefinir sua senha.',
            `Use este link: ${resetLink}`,
            `O link expira em ${ttlMinutes} minutos.`,
            'Se você não solicitou esta alteração, ignore este e-mail.'
        ].join('\n');

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
                <h2 style="color: #2d8f53;">Recuperação de senha</h2>
                <p>Olá, <strong>${safeName}</strong>.</p>
                <p>Recebemos um pedido para redefinir sua senha.</p>
                <p>
                    <a href="${resetLink}" style="display:inline-block; padding:10px 16px; background:#2d8f53; color:#fff; text-decoration:none; border-radius:6px;">
                        Redefinir senha
                    </a>
                </p>
                <p>Ou copie e cole no navegador:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>Este link expira em <strong>${ttlMinutes} minutos</strong>.</p>
                <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
            </div>
        `;

        return this.sendMail({ to, subject, html, text });
    }

    async sendPasswordChangedEmail({ to, nome }) {
        const safeName = nome || 'usuário';
        const subject = 'Senha alterada com sucesso - Six Bikes';
        const text = [
            `Olá, ${safeName}.`,
            'Sua senha foi alterada com sucesso.',
            'Se você não reconhece esta ação, entre em contato com o suporte imediatamente.'
        ].join('\n');

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
                <h2 style="color: #2d8f53;">Senha alterada</h2>
                <p>Olá, <strong>${safeName}</strong>.</p>
                <p>Sua senha foi alterada com sucesso.</p>
                <p>Se você não reconhece esta ação, entre em contato com o suporte imediatamente.</p>
            </div>
        `;

        return this.sendMail({ to, subject, html, text });
    }
}

module.exports = new EmailService();
