// /server/services/ProdutoService.js

const ProdutoRepository = require('../repositories/ProdutoRepository');

/**
 * Implementa a lógica de cadastro e controle de estoque de produtos (UC002, UC003).
 */
class ProdutoService {
    
    /**
     * Cadastra um novo produto no catálogo e inicializa o estoque (UC002).
     * @param {object} dados - { nome, preco, quantidadeInicial }
     * @returns {Promise<number>} O ID do novo produto.
     * @throws {Error} Se os dados forem inválidos.
     */
    async cadastrarProduto(dados) { // UC002
        if (!dados.nome || typeof dados.preco !== 'number' || dados.preco <= 0) { 
            throw new Error("Dados de produto (nome e preço válido) são obrigatórios."); 
        }

        // Valida e normaliza a categoria
        dados.idCategoria = Number.parseInt(dados.idCategoria);
        if (!dados.idCategoria || dados.idCategoria <= 0) {
            throw new Error("Categoria inválida ou ausente. Selecione uma categoria válida.");
        }
        
        // Garante que a quantidade inicial seja um número válido
        dados.quantidadeInicial = Number.parseInt(dados.quantidadeInicial) || 0;

        // Chama ProdutoRepository para criar produto e seu estoque inicial
        const id = await ProdutoRepository.create(dados);
        return id;
    }
    
    /**
     * Lista todos os produtos com a quantidade em estoque (Catálogo - RNF005).
     * @returns {Promise<Array<object>>} Lista de produtos.
     */
    async listarProdutos() { 
        return ProdutoRepository.findAllWithStock(); 
    }

    async listarMaisVendidos(limit = 3) {
        limit = Number.parseInt(limit, 10) || 3;
        return ProdutoRepository.findBestSellers(limit);
    }

    /** Busca um produto por ID com estoque e imagem */
    async buscarPorId(id) {
        id = Number.parseInt(id);
        if (!id || id <= 0) throw new Error('ID de produto inválido.');
        const produto = await ProdutoRepository.findById(id);
        if (!produto) {
            const err = new Error(`Produto ${id} não encontrado.`);
            err.status = 404;
            throw err;
        }
        return produto;
    }
    
    /**
     * Movimenta o estoque (Entrada ou Saída - UC003).
     * Este método é chamado diretamente pelo ProdutoController ou pelo VendaService.
     * * @param {number} id - ID do produto.
     * @param {string} tipo - 'ENTRADA', 'SAIDA' ou 'VENDA'.
     * @param {number} qtd - Quantidade a movimentar.
     * @throws {Error} Se a quantidade for inválida ou o estoque for insuficiente (UC003 Fluxo Alternativo / RF003).
     */
    async movimentarEstoque(id, tipo, qtd) { // UC003
        if (typeof id !== 'number' || typeof qtd !== 'number' || qtd <= 0) {
            throw new Error("ID do produto e quantidade de movimentação devem ser números positivos.");
        }
        
        let delta = qtd;
        
        if (tipo === 'SAIDA' || tipo === 'VENDA') {
            
            // 1. **Checagem de Estoque (Lógica Crítica)**
            // Requer que o repositório tenha um método para buscar o produto com a qtd atual
            const produto = await ProdutoRepository.findById(id); 
            if (!produto) { throw new Error(`Produto ID ${id} não encontrado.`); }
            
            if (produto.qtd < qtd) { 
                // Dispara erro de estoque insuficiente (UC003 Fluxo Alternativo / RF003)
                const error = new Error(`Estoque insuficiente. Disponível: ${produto.qtd}. Solicitado: ${qtd}.`);
                error.status = 400;
                throw error;
            }
            
            delta = -qtd;
        }

        // 2. Persiste a movimentação no repositório
        await ProdutoRepository.updateStock(id, delta);
        return true;
    }

    async listarCategorias() { 
        // Esta função chama o Repositório de Produto para buscar a lista de categorias.
        return ProdutoRepository.findAllCategories(); 
    }

    async criarCategoria(nome) {
        if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
            throw new Error('Nome da categoria é obrigatório.');
        }
        if (nome.trim().length > 100) {
            throw new Error('Nome da categoria deve ter no máximo 100 caracteres.');
        }
        return ProdutoRepository.createCategory(nome);
    }

    /** Atualiza os dados do produto (UC002 - alteração) */
    async atualizarProduto(id, dados) {
        id = Number.parseInt(id);
        if (!id || id <= 0) throw new Error('ID de produto inválido.');
        if (!dados.nome || typeof dados.preco !== 'number' || dados.preco <= 0) {
            throw new Error('Nome e preço válido são obrigatórios.');
        }
        dados.idCategoria = Number.parseInt(dados.idCategoria);
        if (!dados.idCategoria || dados.idCategoria <= 0) {
            throw new Error('Categoria inválida ou ausente.');
        }
        await ProdutoRepository.updateProduct(id, dados);
        return true;
    }

    /** Atualiza a URL da imagem vinculada ao produto */
    async atualizarImagem(id, imageUrl) {
        id = Number.parseInt(id);
        if (!id || id <= 0) throw new Error('ID de produto inválido.');
        if (!imageUrl || typeof imageUrl !== 'string') throw new Error('URL de imagem inválida.');
        await ProdutoRepository.updateImageUrl(id, imageUrl);
        return true;
    }
}

module.exports = new ProdutoService();