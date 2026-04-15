const SiteConfigRepository = require('../repositories/SiteConfigRepository');

const DEFAULT_CONFIG = {
    companyName: 'SixBikes Bicicletaria',
    heroTitle: 'SixBikes Bicicletaria',
    heroSubtitle: 'Agende um servico conosco',
    heroDescription: 'Aqui voce encontra qualidade.',
    heroImageUrl: './assets/img/banner_img_01.png',
    heroImageHistory: [],

    aboutTitle: 'Sobre nos',
    aboutText1: 'Somos especializados em facilitar a vida dos ciclistas. No nosso site, voce pode agendar servicos para sua bike e reservar produtos como Pecas e Acessorios, para retira-los prontos na nossa bicicletaria.',
    aboutText2: 'Com atendimento rapido, servicos de qualidade e a conveniencia de compras sem espera, garantimos a melhor experiencia para voce pedalar com seguranca e conforto.',
    aboutImageUrl: 'assets/img/about-hero.svg',
    aboutImageHistory: [],

    footerAddress: 'Endereco',
    footerPhone: '(11) 99999-9999',
    footerEmail: 'atendimento@sixbikes.com',

    socialFacebook: 'http://facebook.com/',
    socialInstagram: 'https://www.instagram.com/',
    socialTwitter: 'https://twitter.com/',
    socialLinkedin: 'https://www.linkedin.com/',
    atendimentoChatHabilitado: false
};

const ALLOWED_KEYS = Object.keys(DEFAULT_CONFIG);

function toSafeString(value, maxLen = 1200) {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    return text.slice(0, maxLen);
}

function normalizeStoredImageUrl(value) {
    const url = toSafeString(value, 1200);
    if (!url) return '';

    const normalizeExt = (ext) => {
        const clean = String(ext || '').toLowerCase();
        if (clean === 'svg+xml') return 'svg';
        return clean;
    };

    const matchAbsolute = url.match(/^https?:\/\/[^/]+(\/.*)$/i);
    const pathOnly = matchAbsolute ? matchAbsolute[1] : url;

    const uploadsMatch = pathOnly.match(/^\/?uploads\/(site-(?:hero|about)-[a-z0-9-]+)\.([a-z0-9+]+)$/i);
    if (uploadsMatch) return `/assets/img/${uploadsMatch[1]}.${normalizeExt(uploadsMatch[2])}`;

    const assetsMatch = pathOnly.match(/^\/?assets\/img\/(site-(?:hero|about)-[a-z0-9-]+)\.([a-z0-9+]+)$/i);
    if (assetsMatch) return `/assets/img/${assetsMatch[1]}.${normalizeExt(assetsMatch[2])}`;

    if (pathOnly.startsWith('/assets/img/')) return pathOnly;
    return url;
}

function sanitizeImageHistory(list) {
    if (!Array.isArray(list)) return [];
    const unique = [];
    for (const item of list) {
        const normalized = normalizeStoredImageUrl(item);
        if (!normalized) continue;
        if (!unique.includes(normalized)) unique.push(normalized);
        if (unique.length >= 10) break;
    }
    return unique;
}

function updateImageHistory(currentHistory, currentUrl, nextUrl) {
    const normalizedCurrent = normalizeStoredImageUrl(currentUrl);
    const normalizedNext = normalizeStoredImageUrl(nextUrl);
    const fromConfig = sanitizeImageHistory(currentHistory);
    const result = [];

    if (normalizedNext) result.push(normalizedNext);
    if (normalizedCurrent && normalizedCurrent !== normalizedNext) result.push(normalizedCurrent);

    for (const item of fromConfig) {
        if (item !== normalizedNext && item !== normalizedCurrent) {
            result.push(item);
        }
        if (result.length >= 10) break;
    }

    return sanitizeImageHistory(result);
}

class SiteConfigService {
    async getPublicConfig() {
        const raw = await SiteConfigRepository.getRawConfig();
        return { ...DEFAULT_CONFIG, ...(raw || {}) };
    }

    async updateConfig(payload) {
        const current = await this.getPublicConfig();
        const next = { ...current };

        const currentHeroImage = normalizeStoredImageUrl(current.heroImageUrl);
        const currentAboutImage = normalizeStoredImageUrl(current.aboutImageUrl);
        const currentHeroHistory = sanitizeImageHistory(current.heroImageHistory);
        const currentAboutHistory = sanitizeImageHistory(current.aboutImageHistory);

        ALLOWED_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(payload || {}, key)) {
                if (key === 'heroImageUrl' || key === 'aboutImageUrl') {
                    next[key] = normalizeStoredImageUrl(payload[key]);
                    return;
                }
                if (key === 'heroImageHistory' || key === 'aboutImageHistory') {
                    next[key] = sanitizeImageHistory(payload[key]);
                    return;
                }
                const maxLen = key.includes('Text') ? 3000 : 1200;
                next[key] = toSafeString(payload[key], maxLen);
            }
        });

        const nextHeroImage = normalizeStoredImageUrl(next.heroImageUrl || currentHeroImage);
        const nextAboutImage = normalizeStoredImageUrl(next.aboutImageUrl || currentAboutImage);

        next.heroImageUrl = nextHeroImage;
        next.aboutImageUrl = nextAboutImage;
        next.heroImageHistory = updateImageHistory(currentHeroHistory, currentHeroImage, nextHeroImage);
        next.aboutImageHistory = updateImageHistory(currentAboutHistory, currentAboutImage, nextAboutImage);

        const saved = await SiteConfigRepository.updateRawConfig(next);
        return {
            config: { ...DEFAULT_CONFIG, ...(saved?.dados || next) },
            updatedAt: saved?.atualizado_em || null
        };
    }

    async ensureTable() {
        await SiteConfigRepository.ensureTable();
    }

    async getChatConfig() {
        const config = await this.getPublicConfig();
        return {
            atendimentoChatHabilitado: Boolean(config.atendimentoChatHabilitado)
        };
    }

    async updateChatConfig(value) {
        const current = await this.getPublicConfig();
        const next = {
            ...current,
            atendimentoChatHabilitado: Boolean(value)
        };
        await SiteConfigRepository.updateRawConfig(next);
        return { atendimentoChatHabilitado: next.atendimentoChatHabilitado };
    }
}

module.exports = new SiteConfigService();
