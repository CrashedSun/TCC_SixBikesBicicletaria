// server/controllers/ProdutoController.js
const ProdutoService = require('../services/ProdutoService');
const RealtimeService = require('../services/RealtimeService');

class ProdutoController {
    /** Rota: GET /api/produtos */
    async listarTodos(req, res) { 
        const produtos = req.query.sort === 'mais-vendidos'
            ? await ProdutoService.listarMaisVendidos(req.query.limit)
            : await ProdutoService.listarProdutos();
        return res.status(200).json({ message: "Consulta de produtos e estoque OK.", data: produtos }); 
    }

    /** Rota: POST /api/produtos (UC002) */
    async cadastrar(req, res) { 
        try {
            const { imagemBase64, imagemNome } = req.body || {};

            const dados = { ...req.body };
            delete dados.imagemBase64; 
            delete dados.imagemNome;

            const id = await ProdutoService.cadastrarProduto(dados);

            if (imagemBase64 && typeof imagemBase64 === 'string') {
                if (!imagemBase64.startsWith('data:image/')) {
                    return res.status(400).json({ error: 'Formato de imagem inválido' });
                }

                try {
                    await ProdutoService.atualizarImagem(id, imagemBase64);
                } catch (e) {
                    console.warn('Imagem recebida, mas não gravada no DB:', e.message);
                }

                return res.status(201).json({ id, message: "Produto cadastrado com sucesso.", imageUrl: imagemBase64 });
            }

            RealtimeService.publish('produto.criado', { id, scope: 'estoque' });
            return res.status(201).json({ id, message: "Produto cadastrado com sucesso." }); 
        } catch(e) { return res.status(400).json({ error: e.message }); }
    }
    
    /** Rota: PUT /api/estoque/movimentar (UC003) */
    async movimentarEstoque(req, res) { 
        const { id, tipo, qtd } = req.body;
        try {
            const result = await ProdutoService.movimentarEstoque(id, tipo, qtd);
            RealtimeService.publish('estoque.movimentado', { id: Number(id), tipo, qtd, scope: 'estoque' });
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

    async criarCategoria(req, res) {
        try {
            const { nome } = req.body;
            const categoria = await ProdutoService.criarCategoria(nome);
            return res.status(201).json(categoria);
        } catch(e) {
            return res.status(400).json({ error: e.message });
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
            const { imagemBase64, imagemNome, ...dadosProduto } = req.body;

            await ProdutoService.atualizarProduto(req.params.id, dadosProduto);
            let imagemUrl = null;

            if (imagemBase64) {
                if (!imagemBase64.startsWith('data:image/')) {
                    return res.status(400).json({ error: 'Formato de imagem inválido' });
                }

                imagemUrl = imagemBase64;
                await ProdutoService.atualizarImagem(req.params.id, imagemUrl);
            }

            RealtimeService.publish('produto.atualizado', { id: Number(req.params.id), scope: 'estoque' });

            return res.status(200).json({ message: `Produto ${req.params.id} atualizado.`, imagemUrl });
        } catch(e) {
            return res.status(400).json({ error: e.message });
        }
    }
    async deletar(req, res) {
        RealtimeService.publish('produto.deletado', { id: Number(req.params.id), scope: 'estoque' });
        return res.status(200).json({ message: `Produto ${req.params.id} deletado.` });
    }
}
module.exports = new ProdutoController();