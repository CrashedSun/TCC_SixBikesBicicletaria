(() => {
	if (typeof window.installStyledPopupSystem === 'function') {
		window.installStyledPopupSystem();
	}

	const CACHE_KEY_CATS = 'cache:public:footer:categorias';
	const CACHE_KEY_SITE_CFG = 'cache:public:footer:site-config';
	const CACHE_TTL = 5 * 60 * 1000;
	const SITE_CFG_TTL = 30 * 60 * 1000;

	function getApiBaseUrl() {
		if (window.API_BASE_URL) return window.API_BASE_URL;
		return window.location.protocol + '//' + window.location.hostname + ':8080/api';
	}

	function getCachedCategories() {
		try {
			const raw = localStorage.getItem(CACHE_KEY_CATS);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed?.data)) return null;
			if (Date.now() - (parsed.ts || 0) > CACHE_TTL) return null;
			return parsed.data;
		} catch (_) {
			return null;
		}
	}

	function setCachedCategories(data) {
		try {
			localStorage.setItem(CACHE_KEY_CATS, JSON.stringify({ ts: Date.now(), data }));
		} catch (_) {}
	}

	function getCachedSiteConfig() {
		try {
			const raw = localStorage.getItem(CACHE_KEY_SITE_CFG);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object' || typeof parsed.ts !== 'number') return null;
			if (Date.now() - parsed.ts > SITE_CFG_TTL) return null;
			return parsed.data || null;
		} catch (_) {
			return null;
		}
	}

	function setCachedSiteConfig(data) {
		try {
			localStorage.setItem(CACHE_KEY_SITE_CFG, JSON.stringify({ ts: Date.now(), data }));
		} catch (_) {}
	}

	function updateFooterAddress(footer, value) {
		const firstList = footer.querySelector('.footer-link-list');
		const firstItem = firstList ? firstList.querySelector('li') : null;
		if (!firstItem || !value) return;
		const icon = firstItem.querySelector('i');
		firstItem.textContent = '';
		if (icon) firstItem.appendChild(icon);
		firstItem.append(' ' + value);
	}

	function applyHeaderSiteConfig(cfg) {
		if (!cfg || typeof cfg !== 'object') return;
		const companyName = String(cfg.companyName || '').trim();
		if (!companyName) return;

		const headerBrand = document.querySelector('nav.navbar .navbar-brand.logo.h1');
		if (headerBrand) {
			headerBrand.textContent = companyName;
		}
	}

	function updateFooterPhone(footer, value) {
		const phoneLink = footer.querySelector('a[href^="tel:"]');
		if (!phoneLink || !value) return;
		const raw = String(value).trim();
		const digits = raw.replace(/\D/g, '');
		phoneLink.textContent = raw;
		if (digits) phoneLink.href = 'tel:' + digits;
	}

	function updateFooterEmail(footer, value) {
		const emailLink = footer.querySelector('a[href^="mailto:"]');
		if (!emailLink || !value) return;
		const email = String(value).trim();
		emailLink.textContent = email;
		emailLink.href = 'mailto:' + email;
	}

	function updateSocialLink(footer, iconClass, url) {
		if (!url) return;
		const icon = footer.querySelector('i.' + iconClass);
		const link = icon ? icon.closest('a') : null;
		if (!link) return;
		link.href = String(url).trim();
	}

	function applyFooterSiteConfig(cfg) {
		const footer = document.getElementById('tempaltemo_footer');
		if (!cfg || typeof cfg !== 'object') return;

		// Mantem o cabeçalho alinhado com a Home em todas as páginas públicas.
		applyHeaderSiteConfig(cfg);
		if (!footer) return;

		const logos = footer.querySelectorAll('h2.logo');
		if (cfg.companyName) {
			logos.forEach((el) => { el.textContent = String(cfg.companyName).trim(); });
		}

		updateFooterAddress(footer, cfg.footerAddress);
		updateFooterPhone(footer, cfg.footerPhone);
		updateFooterEmail(footer, cfg.footerEmail);

		updateSocialLink(footer, 'fa-facebook-f', cfg.socialFacebook);
		updateSocialLink(footer, 'fa-instagram', cfg.socialInstagram);
		updateSocialLink(footer, 'fa-twitter', cfg.socialTwitter);
		updateSocialLink(footer, 'fa-linkedin', cfg.socialLinkedin);
	}

	async function loadFooterSiteConfig() {
		const footer = document.getElementById('tempaltemo_footer');
		if (!footer) return;

		const cached = getCachedSiteConfig();
		if (cached) {
			applyFooterSiteConfig(cached);
			return;
		}

		try {
			const resp = await fetch(getApiBaseUrl() + '/site-config/public');
			if (!resp.ok) return;
			const cfg = await resp.json();
			setCachedSiteConfig(cfg);
			applyFooterSiteConfig(cfg);
		} catch (_) {
			// Mantem o rodape atual se API indisponivel.
		}
	}

	function findFooterProductsList() {
		const footer = document.getElementById('tempaltemo_footer');
		if (!footer) return null;

		const headings = footer.querySelectorAll('h2');
		for (const h2 of headings) {
			if ((h2.textContent || '').trim().toLowerCase() === 'produtos') {
				const ul = h2.parentElement ? h2.parentElement.querySelector('ul.footer-link-list') : null;
				if (ul) return ul;
			}
		}

		return null;
	}

	function buildCategoryItem(nome) {
		const li = document.createElement('li');
		const a = document.createElement('a');
		a.className = 'text-decoration-none';
		a.href = 'produtos.html?categoria=' + encodeURIComponent(nome);
		a.textContent = nome;
		li.appendChild(a);
		return li;
	}

	async function loadFooterCategories() {
		const list = findFooterProductsList();
		if (!list) return;

		const cached = getCachedCategories();
		if (cached && cached.length > 0) {
			list.innerHTML = '';
			cached.forEach((nome) => list.appendChild(buildCategoryItem(nome)));
			return;
		}

		try {
			let validNames = [];

			const response = await fetch(getApiBaseUrl() + '/produtos/categorias');
			if (response.ok) {
				const data = await response.json();
				const categories = Array.isArray(data) ? data : [];
				validNames = categories
					.map((c) => (c && c.nome ? String(c.nome).trim() : ''))
					.filter(Boolean);
			}

			if (validNames.length === 0) {
				const productsResp = await fetch(getApiBaseUrl() + '/produtos/public');
				if (productsResp.ok) {
					const productsData = await productsResp.json();
					const products = Array.isArray(productsData?.data) ? productsData.data : [];
					const set = new Set(
						products
							.map((p) => String(p?.categoria || '').trim())
							.filter(Boolean)
					);
					validNames = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
				}
			}

			if (validNames.length === 0) return;
			setCachedCategories(validNames);

			list.innerHTML = '';
			validNames.forEach((nome) => {
				list.appendChild(buildCategoryItem(nome));
			});
		} catch (_) {
			// Mantem o footer como esta se a API estiver indisponivel.
		}
	}

	document.addEventListener('DOMContentLoaded', () => {
		loadFooterCategories();
		loadFooterSiteConfig();
	});
	window.addEventListener('sb:realtime', (ev) => {
		const type = String(ev?.detail?.type || '').toLowerCase();
		if (type.includes('produto') || type.includes('estoque') || type.includes('servico') || type.includes('categoria')) {
			try { localStorage.removeItem(CACHE_KEY_CATS); } catch (_) {}
			loadFooterCategories();
		}
		if (type.includes('site-config') || type.includes('siteconfig')) {
			try { localStorage.removeItem(CACHE_KEY_SITE_CFG); } catch (_) {}
			loadFooterSiteConfig();
		}
	});
})();
