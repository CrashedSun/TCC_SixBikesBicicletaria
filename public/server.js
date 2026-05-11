// public/server.js — Servidor estático do FRONTEND (separado do backend)
// Serve os arquivos HTML/CSS/JS da pasta public na porta 3000.
// Toda comunicação com o backend é feita via fetch JSON → http://localhost:8080/api

const express = require('express');
const path = require('path');

const app = express();
// Em ambientes gerenciados (Cloud Run) o proxy frontal define o protocolo original
app.set('trust proxy', true);
const PORT = process.env.FRONTEND_PORT || 3000;

function getApiBaseUrl(req) {
    const configured = String(process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    if (configured) return configured;
    return `${req.protocol}://${req.hostname}:8080/api`;
}

app.get('/assets/js/runtime-config.js', (req, res) => {
    const apiBaseUrl = getApiBaseUrl(req);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`window.API_BASE_URL = window.API_BASE_URL || ${JSON.stringify(apiBaseUrl)};`);
});

// Serve todos os arquivos estáticos desta pasta (public/)
app.use(express.static(path.join(__dirname)));

// Fallback: qualquer rota não encontrada devolve index.html (SPA-like)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FRONTEND] Rodando em http://0.0.0.0:${PORT}`);
    console.log(`[FRONTEND] Acessar: http://localhost:${PORT}/index.html`);
    console.log(`[FRONTEND] O backend (API) deve estar rodando na porta 8080`);
});
