// public/server.js — Servidor estático do FRONTEND (separado do backend)
// Serve os arquivos HTML/CSS/JS da pasta public na porta 3000.
// Toda comunicação com o backend é feita via fetch JSON → http://localhost:8080/api

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

// Serve todos os arquivos estáticos desta pasta (public/)
app.use(express.static(path.join(__dirname)));

// Fallback: qualquer rota não encontrada devolve index.html (SPA-like)
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[FRONTEND] Rodando em http://localhost:${PORT}`);
    console.log(`[FRONTEND] Acessar: http://localhost:${PORT}/index.html`);
    console.log(`[FRONTEND] O backend (API) deve estar rodando em http://localhost:8080`);
});
