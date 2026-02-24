import express from 'express';
import { uploadProductImages } from '../middlewares/uploadMiddleware.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import {
    addProduct,
    updateProduct,
    deleteProduct,
    uploadImages,
    getProducts,
    getOrders,
    updateOrderStatus,
    getUsers,
    getStats,
    getOffers,
    createOffer,
    applyOffer,
    getAllDesigns,
    updateDesignStatus
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticate, authorizeAdmin);

// Product Management
router.post('/product/upload-image', uploadProductImages, uploadImages);
router.post('/product/add', addProduct);
router.put('/product/update/:id', updateProduct);
router.delete('/product/delete/:id', deleteProduct);
router.get('/products', getProducts);

// Order Management
router.get('/orders', getOrders);
router.patch('/order/status/:id', updateOrderStatus);

// User Management
router.get('/users', getUsers);

// Dashboard Stats
router.get('/stats', getStats);

// Offers Management
router.get('/offers', getOffers);
router.post('/offers', createOffer);
router.post('/offers/apply', applyOffer);

// Design Upload Management
router.get('/designs', getAllDesigns);
router.patch('/designs/:id/status', updateDesignStatus);

export default router;
