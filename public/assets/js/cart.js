(function(){
  const CART_KEY = 'sixbikes_cart';

  function read(){
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function write(items){
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }
  function formatBRL(n){
    const num = typeof n === 'number' ? n : parseFloat(String(n||'0').replace(',', '.'));
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num)?0:num);
  }

  const Cart = {
    get(){ return read(); },
    save(items){ write(items); },
    clear(){ write([]); },
    add(item, qty=1){
      if(!item || !item.id) return;
      const items = read();
      const idx = items.findIndex(it => String(it.id) === String(item.id));
      const q = Math.max(1, parseInt(qty,10)||1);
      const stock = typeof item.estoque === 'number' ? item.estoque : (typeof item.qtd === 'number' ? item.qtd : undefined);
      if (typeof stock === 'number' && stock <= 0) {
        // Não permitir adicionar produto sem estoque
        return items;
      }
      if(idx >= 0){
        const max = typeof items[idx].estoque === 'number' ? items[idx].estoque : (typeof stock === 'number' ? stock : Infinity);
        items[idx].qty = Math.min((items[idx].qty||0) + q, max);
      } else {
        items.push({
          id: item.id,
          nome: item.nome || 'Produto',
          preco: typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco||'0').replace(',', '.')) || 0,
          imagemUrl: item.imagemUrl || 'assets/img/category_img_01.webp',
          estoque: stock,
          qty: typeof stock === 'number' ? Math.min(q, stock) : q
        });
      }
      write(items);
      return items;
    },
    updateQty(id, qty){
      const items = read();
      const idx = items.findIndex(it => String(it.id) === String(id));
      if(idx === -1) return items;
      const q = Math.max(1, parseInt(qty,10)||1);
      const max = typeof items[idx].estoque === 'number' ? items[idx].estoque : Infinity;
      items[idx].qty = Math.min(q, max);
      write(items);
      return items;
    },
    remove(id){
      const next = read().filter(it => String(it.id) !== String(id));
      write(next);
      return next;
    },
    subtotal(){
      return read().reduce((sum, it) => sum + (Number(it.preco)||0) * (Number(it.qty)||0), 0);
    },
    count(){
      return read().reduce((sum, it) => sum + (Number(it.qty)||0), 0);
    },
    formatBRL
  };

  window.Cart = Cart;
})();
