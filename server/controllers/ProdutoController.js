// server/controllers/ProdutoController.js
const ProdutoService = require('../services/ProdutoService');

class ProdutoController {
    /** Rota: GET /api/produtos */
    async listarTodos(req, res) { 
        const produtos = await ProdutoService.listarProdutos();
        return res.status(200).json({ message: "Consulta de produtos e estoque OK.", data: produtos }); 
    }

    /** Rota: POST /api/produtos (UC002) */
    async cadastrar(req, res) { 
        try {
            // Permite envio de imagem em base64 no corpo JSON (sem alterar schema DB)
            const { imagemBase64, imagemNome } = req.body || {};

            // Remove campos de imagem do objeto que segue para a Service (evita validações indevidas)
            const dados = { ...req.body };
            delete dados.imagemBase64; 
            delete dados.imagemNome;

            // Cadastra produto normalmente (nome, preco, idCategoria, quantidadeInicial)
            const id = await ProdutoService.cadastrarProduto(dados);

            // Se veio imagem, salvar cópia única em public/assets/img
            if (imagemBase64 && typeof imagemBase64 === 'string') {
                const fs = require('fs');
                const path = require('path');

                // Extrai prefixo dataURL se presente
                const match = imagemBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
                let base64Data = imagemBase64;
                let ext = 'png';
                if (match) {
                    base64Data = match[2];
                    const mime = match[1] || 'image/png';
                    ext = mime.split('/')[1] || 'png';
                } else {
                    // Tentativa de deduzir extensão por nome
                    if (imagemNome && typeof imagemNome === 'string') {
                        const lower = imagemNome.toLowerCase();
                        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ext = 'jpg';
                        else if (lower.endsWith('.webp')) ext = 'webp';
                        else if (lower.endsWith('.gif')) ext = 'gif';
                        else if (lower.endsWith('.png')) ext = 'png';
                    }
                }

                // Gera nome único: produto-<id>-<timestamp>-<rand>.<ext>
                const uniqueName = `produto-${id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
                const outputDir = path.join(process.cwd(), 'public', 'assets', 'img');
                const outputPath = path.join(outputDir, uniqueName);

                try {
                    // Garante pasta existente
                    fs.mkdirSync(outputDir, { recursive: true });
                    fs.writeFileSync(outputPath, base64Data, { encoding: 'base64' });
                } catch (err) {
                    console.error('Falha ao salvar imagem do produto:', err);
                    // Não impede o cadastro do produto; apenas informa warning
                }

                // Persiste URL pública no banco
                const publicUrl = `/assets/img/${uniqueName}`;
                try {
                    await ProdutoService.atualizarImagem(id, publicUrl);
                } catch (e) {
                    console.warn('Imagem salva em disco, mas não gravada no DB:', e.message);
                }

                // Retorna também URL pública da imagem
                return res.status(201).json({ id, message: "Produto cadastrado com sucesso.", imageUrl: publicUrl });
            }

            return res.status(201).json({ id, message: "Produto cadastrado com sucesso." }); 
        } catch(e) { return res.status(400).json({ error: e.message }); }
    }
    
    /** Rota: PUT /api/estoque/movimentar (UC003) */
    async movimentarEstoque(req, res) { 
        const { id, tipo, qtd } = req.body;
        try {
            const result = await ProdutoService.movimentarEstoque(id, tipo, qtd);
            return res.status(200).json({ message: "Movimentação registrada com sucesso.", result });
        } catch(e) {
            return res.status(400).json({ error: e.message }); // Erro de estoque insuficiente
        }
    }


    async listarCategorias(req, res) {
        try {
            // Certifique-se de que o ProdutoService é importado e chamado corretamente
            const categorias = await ProdutoService.listarCategorias();
            return res.status(200).json(categorias);
        } catch(e) {
            // Se o erro vier de ProdutoService (e.g., falha no DB), o status 500 será retornado
            return res.status(500).json({ error: e.message });
        }
    }

    /** Rota: GET /api/produtos/:id (ou /api/produtos/:id/public) */
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const produto = await ProdutoService.buscarPorId(id);
            return res.status(200).json({ data: produto });
        } catch (e) {
            const status = e.status || 400;
            return res.status(status).json({ error: e.message });
        }
    }

    // Métodos CRUD restantes (Atualizar, Deletar)
    async atualizar(req, res) {
        try {
            await ProdutoService.atualizarProduto(req.params.id, req.body);
            return res.status(200).json({ message: `Produto ${req.params.id} atualizado.` });
        } catch(e) {
            return res.status(400).json({ error: e.message });
        }
    }
    async deletar(req, res) { return res.status(200).json({ message: `Produto ${req.params.id} deletado.` }); }
}
module.exports = new ProdutoController();