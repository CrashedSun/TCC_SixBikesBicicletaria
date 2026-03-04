(function(){
  const MODAL_ID = 'templatemo_search';
  const INPUT_ID = 'inputModalSearch';
  const RESULTS_ID = 'search-suggestions';
  const DETAIL_PAGE = 'shop-single.html?id=';

  let productsCache = null;
  let lastQuery = '';
  let debounceTimer = null;

  function baseApi(){
    try { return (window.API_BASE_URL || (location.origin + '/api')); } catch(e){ return '/api'; }
  }

  async function fetchProducts(){
    if (productsCache) return productsCache;
    try{
      const resp = await fetch(`${baseApi()}/produtos/public`);
      const data = await resp.json().catch(()=>({data:[]}));
      if(!resp.ok || !data || !Array.isArray(data.data)) throw new Error('bad');
      productsCache = data.data.map(p => ({
        id: p.id ?? p.idproduto ?? p.idProduto ?? p.id_produto,
        nome: p.nome || '',
        imagemUrl: p.imagemUrl || 'assets/img/category_img_01.webp',
      })).filter(x => x.id != null);
      return productsCache;
    }catch(e){
      productsCache = [];
      return productsCache;
    }
  }

  function ensureResultsContainer(input){
    let list = document.getElementById(RESULTS_ID);
    if (!list){
      list = document.createElement('div');
      list.id = RESULTS_ID;
      list.className = 'list-group w-100 mt-2';
      input.closest('form')?.appendChild(list);
    }
    return list;
  }

  function clearResults(list){ list.innerHTML = ''; list.style.display = 'none'; }

  function renderResults(list, items){
    list.innerHTML = '';
    if(!items || items.length === 0){ list.style.display = 'none'; return; }
    items.slice(0,8).forEach(it => {
      const a = document.createElement('a');
      a.className = 'list-group-item list-group-item-action d-flex align-items-center';
      a.href = DETAIL_PAGE + encodeURIComponent(it.id);
      const img = document.createElement('img');
      img.src = it.imagemUrl || 'assets/img/category_img_01.webp';
      img.alt = it.nome || `Produto ${it.id}`;
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      img.className = 'me-2';
      const span = document.createElement('span');
      span.textContent = it.nome || `Produto ${it.id}`;
      a.appendChild(img);
      a.appendChild(span);
      list.appendChild(a);
    });
    list.style.display = 'block';
  }

  function normalize(s){ return String(s||'').toLowerCase(); }

  async function handleQuery(input){
    const q = normalize(input.value);
    if (q === lastQuery) return;
    lastQuery = q;
    const list = ensureResultsContainer(input);
    if (!q || q.length < 2){ clearResults(list); return; }
    const products = await fetchProducts();
    const filtered = products.filter(p => normalize(p.nome).includes(q));
    renderResults(list, filtered);
  }

  function attach(){
    const modal = document.getElementById(MODAL_ID);
    const input = document.getElementById(INPUT_ID);
    if(!modal || !input) return;

    // prefetch on modal open for snappier UX
    modal.addEventListener('shown.bs.modal', () => { fetchProducts().catch(()=>{}); input.focus(); });
    modal.addEventListener('hidden.bs.modal', () => {
      const list = document.getElementById(RESULTS_ID);
      if(list) clearResults(list);
      input.value = '';
      lastQuery = '';
    });

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleQuery(input), 150);
    });
  }

  // Auto-attach on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  // Export manual attach if needed
  window.attachProductSearch = attach;
})();
