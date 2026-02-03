const ProductModel = require('../models/productModel');

class ProductController {
    static async createProduct(req, res) {
        try {
            const productData = req.body;
            const exists = await ProductModel.existsByName(productData.product_name);
            if (exists) {
                return res.status(400).json({ success: false, message: 'Product name already exists' });
            }
            const newProduct = await ProductModel.create(productData);
            res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
        }
    }

    static async getAllProducts(req, res) {
        try {
            const products = await ProductModel.findAll();
            res.status(200).json({ success: true, count: products.length, data: products });
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
        }
    }

    static async getProductById(req, res) {
        try {
            const { id } = req.params;
            const product = await ProductModel.findById(id);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
            res.status(200).json({ success: true, data: product });
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
        }
    }

    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const productData = req.body;
            const exists = await ProductModel.existsByName(productData.product_name, id);
            if (exists) {
                return res.status(400).json({ success: false, message: 'Product name already exists' });
            }
            const updatedProduct = await ProductModel.update(id, productData);
            res.status(200).json({ success: true, message: 'Product updated successfully', data: updatedProduct });
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
        }
    }

    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            await ProductModel.delete(id);
            res.status(200).json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
        }
    }
}

module.exports = ProductController;
