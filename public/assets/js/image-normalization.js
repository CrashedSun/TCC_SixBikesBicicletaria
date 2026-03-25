// Normalizar URLs de imagens para apontar ao backend correto (porta 8080)
function normalizeImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') return '/assets/img/category_img_01.webp';
    
    const path = imagePath.toString().trim();
    if (!path) return '/assets/img/category_img_01.webp';
    
    // Se já é URL completa, retorna assim
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // Se é caminho relativo (com ou sem /), aponta para backend na porta 8080
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${window.location.protocol}//${window.location.hostname}:8080${cleanPath}`;
}

// Exporta para window se needed
window.normalizeImageUrl = normalizeImageUrl;
