(() => {
	if (typeof window.installStyledPopupSystem === 'function') {
		window.installStyledPopupSystem();
	}

	const CACHE_KEY_CATS = 'cache:public:footer:categorias';
	const CACHE_TTL = 5 * 60 * 1000;

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

	document.addEventListener('DOMContentLoaded', loadFooterCategories);
	window.addEventListener('sb:realtime', (ev) => {
		const type = String(ev?.detail?.type || '').toLowerCase();
		if (type.includes('produto') || type.includes('estoque') || type.includes('servico') || type.includes('categoria')) {
			try { localStorage.removeItem(CACHE_KEY_CATS); } catch (_) {}
			loadFooterCategories();
		}
	});
})();
