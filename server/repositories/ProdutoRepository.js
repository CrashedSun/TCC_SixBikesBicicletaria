// /server/repositories/ProdutoRepository.js

const db = require('../config/database');
const pool = db.pool; // Acessa a Pool do PostgreSQL

/**
 * Repositório para operações de Produto e Estoque (UC002, UC003).
 * GARANTE TRANSAÇÕES E JOINs CORRETOS.
 */
class ProdutoRepository {
    
    /**
     * Busca um produto pelo ID, retornando detalhes e a quantidade em estoque.
     * Necessário para a checagem de estoque antes da saída (UC003).
     * @param {number} id - ID do produto (idProduto).
     * @returns {Promise<object | null>} Objeto { idProduto, nome, qtd, ... } ou null.
     */
    async findById(id) {
        const query = `
                 SELECT p.idproduto AS "idProduto", p.nome, p.descricao, p.preco, 
                     e.quantidadeatual AS qtd, c.nome AS categoria, p.imagem_url AS "imagemUrl"
                 FROM produto p
                 JOIN estoque e ON p.idproduto = e.idproduto
                 LEFT JOIN categoria c ON p.idcategoria = c.idcategoria
                 WHERE p.idproduto = $1;
        `;
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('ERRO findById (Produto):', error.message);
            // Retorna a exceção para ser tratada na camada de Serviço
            throw new Error('Falha ao buscar produto no banco de dados.');
        }
    }

    /**
     * Lista todos os produtos com suas quantidades em estoque (Catálogo - RNF005).
     * @returns {Promise<Array<object>>} Lista de produtos.
     */
    async findAllWithStock() {
        const query = `
                 SELECT p.idproduto AS "idProduto", p.nome, p.descricao, p.preco, 
                     COALESCE(e.quantidadeatual, 0) AS qtd, 
                     c.nome AS categoria,
                     p.imagem_url AS "imagemUrl"
                 FROM produto p
                 LEFT JOIN estoque e ON p.idproduto = e.idproduto
                 LEFT JOIN categoria c ON p.idcategoria = c.idcategoria
            ORDER BY p.nome;
        `;
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            // Tratamento específico para evitar quebra se as tabelas não existirem
            if (error.code === '42P01') { 
                 console.warn("Tabelas de Produto ou Estoque não existem. Retornando catálogo vazio.");
                 return [];
            }
            console.error('ERRO findAllWithStock:', error.message);
            throw new Error('Falha ao consultar catálogo de produtos.');
        }
    }

    /**
     * Registra um novo produto e inicializa seu estoque em uma transação (UC002).
     * @param {object} produtoData - { nome, descricao, preco, quantidadeInicial, idCategoria }
     * @returns {Promise<number>} O ID do novo produto (idProduto).
     */
    async create(produtoData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Inserir o Produto
            const produtoQuery = `
                INSERT INTO Produto (nome, descricao, preco, idcategoria)
                VALUES ($1, $2, $3, $4)
                RETURNING idproduto AS "idProduto"; 
            `;
            const produtoResult = await client.query(produtoQuery, [
                produtoData.nome,
                produtoData.descricao,
                produtoData.preco,
                produtoData.idCategoria 
            ]);
            
            // 2. Capturar o ID
            // CORREÇÃO: Capturando o valor pela chave 'idProduto' retornada
            const produtoId = produtoResult.rows[0]?.idProduto || produtoResult.rows[0]?.idproduto; 

            // 3. Inserir o Estoque Inicial (agora com um produtoId garantido)
            const estoqueQuery = `
                INSERT INTO Estoque (idproduto, quantidadeatual)
                VALUES ($1, $2);
            `;
            await client.query(estoqueQuery, [produtoId, produtoData.quantidadeInicial]);

            await client.query('COMMIT');
            return produtoId;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('ERRO CREATE PRODUTO/ESTOQUE (Transação):', error.message);
            throw new Error('Falha na criação do produto e estoque.');
        } finally {
            client.release();
        }
    }

    /**
     * Atualiza a quantidade em estoque (entrada/saída - UC003).
     * @param {number} id - ID do produto (idProduto).
     * @param {number} quantidadeDelta - Valor positivo (entrada) ou negativo (saída).
     */
    async updateStock(id, quantidadeDelta) {
        const query = `
            UPDATE Estoque
            SET quantidadeAtual = quantidadeAtual + $2
            WHERE idProduto = $1;
        `;
        try {
            const result = await pool.query(query, [id, quantidadeDelta]);
            if (result.rowCount === 0) {
                throw new Error(`Estoque para o produto ID ${id} não foi encontrado.`);
            }
            return true;
        } catch (error) {
            console.error('ERRO updateStock:', error.message);
            throw new Error('Falha ao atualizar o estoque.');
        }
    }

    /**
     * Atualiza dados básicos do produto: nome, descricao, preco e idcategoria.
     * @param {number} id - idproduto
     * @param {{nome:string, descricao:string, preco:number, idCategoria:number}} dados
     */
    async updateProduct(id, dados) {
        const query = `
            UPDATE produto
            SET nome = $2,
                descricao = $3,
                preco = $4,
                idcategoria = $5
            WHERE idproduto = $1;
        `;
        try {
            await pool.query(query, [
                id,
                dados.nome,
                dados.descricao,
                dados.preco,
                dados.idCategoria
            ]);
            return true;
        } catch (error) {
            console.error('ERRO updateProduct:', error.message);
            throw new Error('Falha ao atualizar dados do produto.');
        }
    }

    /** Atualiza apenas o caminho/URL da imagem do produto */
    async updateImageUrl(id, imageUrl) {
        const query = `
            UPDATE produto
            SET imagem_url = $2
            WHERE idproduto = $1;
        `;
        try {
            await pool.query(query, [id, imageUrl]);
            return true;
        } catch (error) {
            console.error('ERRO updateImageUrl:', error.message);
            throw new Error('Falha ao atualizar imagem do produto.');
        }
    }

    async findAllCategories() {
        const query = `
            SELECT idcategoria, nome
            FROM Categoria
            ORDER BY nome;
        `;
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            if (error.code === '42P01') { 
                 // Se a tabela Categoria não existir, avisa, mas não quebra a aplicação
                 console.warn("Tabela 'Categoria' não existe. Retornando lista vazia.");
                 return [];
            }
            console.error('ERRO findAllCategories:', error.message);
            throw new Error('Falha ao consultar categorias.');
        }
    }

    async createCategory(nome) {
        const query = `
            INSERT INTO Categoria (nome)
            VALUES ($1)
            RETURNING idcategoria, nome;
        `;
        try {
            const result = await pool.query(query, [nome.trim()]);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') {
                throw new Error('Já existe uma categoria com esse nome.');
            }
            console.error('ERRO createCategory:', error.message);
            throw new Error('Falha ao criar categoria.');
        }
    }

    async listarCategorias() { 
        // Apenas repassa a chamada para o Repositório, que fará o SELECT no DB.
        return ProdutoRepository.findAllCategories(); 
    }
}

module.exports = new ProdutoRepository();