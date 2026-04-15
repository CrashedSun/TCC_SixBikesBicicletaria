const SiteConfigService = require('../services/SiteConfigService');
const fs = require('fs');
const path = require('path');

function getPublicBaseUrl(req) {
    const configured = (process.env.PUBLIC_API_BASE_URL || '').trim();
    if (configured) return configured.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

function toAbsoluteIfNeeded(req, url) {
    if (!url || typeof url !== 'string') return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/assets/img/') || url.startsWith('/uploads/')) return `${getPublicBaseUrl(req)}${url}`;
    return url;
}

function normalizeLegacyUploadUrl(url) {
    if (!url || typeof url !== 'string') return url;

    const normalizeExt = (ext) => {
        const clean = String(ext || '').toLowerCase();
        if (clean === 'svg+xml') return 'svg';
        return clean;
    };

    // Compatibilidade: converte /uploads/* para padrão atual /assets/img/*
    const uploadMatch = url.match(/^\/?uploads\/(site-(?:hero|about)-[a-z0-9-]+)\.([a-z0-9+]+)$/i);
    if (uploadMatch) return `/assets/img/${uploadMatch[1]}.${normalizeExt(uploadMatch[2])}`;

    const assetsMatch = url.match(/^\/?assets\/img\/(site-(?:hero|about)-[a-z0-9-]+)\.([a-z0-9+]+)$/i);
    if (assetsMatch) return `/assets/img/${assetsMatch[1]}.${normalizeExt(assetsMatch[2])}`;

    return url;
}

function normalizeIncomingImageUrl(value) {
    if (!value || typeof value !== 'string') return '';
    const raw = value.trim();
    if (!raw) return '';

    const absMatch = raw.match(/^https?:\/\/[^/]+(\/.*)$/i);
    const pathOnly = absMatch ? absMatch[1] : raw;
    return normalizeLegacyUploadUrl(pathOnly);
}

function normalizeHistoryForResponse(req, list) {
    if (!Array.isArray(list)) return [];
    return list
        .map((item) => toAbsoluteIfNeeded(req, normalizeLegacyUploadUrl(item)))
        .filter(Boolean)
        .slice(0, 10);
}

function normalizeConfigForResponse(req, config) {
    const out = { ...(config || {}) };
    out.heroImageUrl = toAbsoluteIfNeeded(req, normalizeLegacyUploadUrl(out.heroImageUrl));
    out.aboutImageUrl = toAbsoluteIfNeeded(req, normalizeLegacyUploadUrl(out.aboutImageUrl));
    out.heroImageHistory = normalizeHistoryForResponse(req, out.heroImageHistory);
    out.aboutImageHistory = normalizeHistoryForResponse(req, out.aboutImageHistory);
    return out;
}

function saveImageFromBase64(base64Input, originalName, prefix) {
    if (!base64Input || typeof base64Input !== 'string') return null;

    const match = base64Input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    let base64Data = base64Input;
    let ext = 'png';

    if (match) {
        base64Data = match[2];
        const mime = match[1] || 'image/png';
        ext = (mime.split('/')[1] || 'png').toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'svg+xml') ext = 'svg';
    } else if (originalName && typeof originalName === 'string') {
        const name = originalName.toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) ext = 'jpg';
        else if (name.endsWith('.webp')) ext = 'webp';
        else if (name.endsWith('.gif')) ext = 'gif';
        else if (name.endsWith('.svg')) ext = 'svg';
        else if (name.endsWith('.png')) ext = 'png';
    }

    const safePrefix = String(prefix || 'site').replace(/[^a-z0-9_-]/gi, '');
    const filename = `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const outputDir = path.join(process.cwd(), 'public', 'assets', 'img');
    const outputPath = path.join(outputDir, filename);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, base64Data, { encoding: 'base64' });

    // URL pública padrão em /assets/img
    return `/assets/img/${filename}`;
}

class SiteConfigController {
    async getChatConfig(req, res) {
        try {
            const data = await SiteConfigService.getChatConfig();
            return res.status(200).json(data);
        } catch (e) {
            return res.status(500).json({ error: e.message || 'Falha ao carregar configuração de chat.' });
        }
    }

    async updateChatConfig(req, res) {
        try {
            const enabled = Boolean(req.body?.atendimentoChatHabilitado);
            const data = await SiteConfigService.updateChatConfig(enabled);
            return res.status(200).json({ message: 'Configuração de chat atualizada.', ...data });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Falha ao atualizar configuração de chat.' });
        }
    }

    async getPublic(req, res) {
        try {
            const config = await SiteConfigService.getPublicConfig();
            return res.status(200).json(normalizeConfigForResponse(req, config));
        } catch (e) {
            return res.status(500).json({ error: e.message || 'Falha ao carregar configuracoes do site.' });
        }
    }

    async getForOwner(req, res) {
        try {
            const config = await SiteConfigService.getPublicConfig();
            return res.status(200).json(normalizeConfigForResponse(req, config));
        } catch (e) {
            return res.status(500).json({ error: e.message || 'Falha ao carregar configuracoes do site.' });
        }
    }

    async update(req, res) {
        try {
            const payload = { ...(req.body || {}) };

            // Fluxo de upload igual produtos/servicos: recebe base64 + nome e grava arquivo fisico.
            if (payload.heroImageBase64) {
                payload.heroImageUrl = saveImageFromBase64(payload.heroImageBase64, payload.heroImageName, 'site-hero');
            } else if (payload.heroImageUrl) {
                payload.heroImageUrl = normalizeIncomingImageUrl(payload.heroImageUrl);
            }

            if (payload.aboutImageBase64) {
                payload.aboutImageUrl = saveImageFromBase64(payload.aboutImageBase64, payload.aboutImageName, 'site-about');
            } else if (payload.aboutImageUrl) {
                payload.aboutImageUrl = normalizeIncomingImageUrl(payload.aboutImageUrl);
            }

            delete payload.heroImageBase64;
            delete payload.heroImageName;
            delete payload.aboutImageBase64;
            delete payload.aboutImageName;

            const result = await SiteConfigService.updateConfig(payload);
            return res.status(200).json({
                message: 'Configuracoes do site salvas com sucesso.',
                ...result,
                config: normalizeConfigForResponse(req, result?.config || {})
            });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Falha ao salvar configuracoes do site.' });
        }
    }
}

module.exports = new SiteConfigController();
