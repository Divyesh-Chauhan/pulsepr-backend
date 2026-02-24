import express from 'express';
import { getAllProducts, getProductById, searchProducts, getProductsByCategory } from '../controllers/productController.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/:id', getProductById);
router.get('/category/:category', getProductsByCategory);

export default router;
